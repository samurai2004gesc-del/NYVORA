// Proveedores de IA de imagen. Solo se usa en el servidor (la clave nunca llega al navegador).

import sharp from "sharp";

export type Proveedor = "openai" | "gemini" | "nyvora";
export type Calidad = "estandar" | "maxima";

export interface ImagenEntrada {
  mime: string;
  base64: string;
}

export interface ImagenSalida {
  dataUrl: string;
  proveedor: Proveedor;
  modelo: string;
  /** Lado de la imagen generada, en píxeles. */
  lado: number;
}

/** «modelo»: la cuenta no tiene ese modelo; «tamano»: el modelo no acepta esa resolución. */
type Recuperable = "modelo" | "tamano" | null;

export class ErrorIA extends Error {
  readonly status: number;
  readonly recuperable: Recuperable;
  constructor(message: string, status = 502, recuperable: Recuperable = null) {
    super(message);
    this.status = status;
    this.recuperable = recuperable;
  }
}

// Del mejor al más antiguo. Si la cuenta no tiene acceso a uno, se prueba el siguiente.
const MODELOS_OPENAI = ["gpt-image-2", "gpt-image-1.5", "gpt-image-1"];
const MODELOS_GEMINI = ["gemini-3-pro-image", "gemini-3.1-flash-image", "gemini-2.5-flash-image"];

const claveGemini = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";

/** El motor propio: un modelo abierto con el LoRA de NYVORA, servido en fal.ai. */
const motorPropioListo = () => Boolean(process.env.FAL_KEY && process.env.NYVORA_MOTOR_ENDPOINT);

export function proveedoresDisponibles(): Proveedor[] {
  const lista: Proveedor[] = [];
  if (claveGemini()) lista.push("gemini");
  if (process.env.OPENAI_API_KEY) lista.push("openai");
  if (motorPropioListo()) lista.push("nyvora");
  return lista;
}

/** Con las dos claves, Gemini (Nano Banana Pro) va primero: es el más fiel en fotorrealismo. */
export function proveedorConfigurado(): Proveedor | null {
  const disponibles = proveedoresDisponibles();
  const elegido = process.env.NYVORA_IMAGE_PROVIDER?.toLowerCase();
  if (disponibles.includes(elegido as Proveedor)) return elegido as Proveedor;
  return disponibles[0] ?? null;
}

const candidatos = (variable: string, lista: string[]) => {
  const propio = process.env[variable];
  return propio ? [propio, ...lista.filter((m) => m !== propio)] : lista;
};

export async function generarImagen(proveedor: Proveedor, prompt: string, img: ImagenEntrada, calidad: Calidad = "maxima"): Promise<ImagenSalida> {
  if (proveedor === "nyvora") return conMotorPropio(prompt, img);

  // Cada modelo se intenta con la mejor resolución y, si no la acepta, con la siguiente.
  const intentos =
    proveedor === "openai"
      ? candidatos("OPENAI_IMAGE_MODEL", MODELOS_OPENAI).map((modelo) =>
          (calidad === "maxima" ? [2048, 1024] : [1024]).map((lado) => () => conOpenAI(modelo, lado, calidad, prompt, img)),
        )
      : candidatos("GEMINI_IMAGE_MODEL", MODELOS_GEMINI).map((modelo) =>
          (modelo.startsWith("gemini-3") ? [calidad === "maxima" ? "2K" : "1K", null] : [null]).map((tam) => () => conGemini(modelo, tam, prompt, img)),
        );

  let primero: ErrorIA | null = null;
  for (const tamanos of intentos) {
    for (const intento of tamanos) {
      try {
        return await intento();
      } catch (e) {
        if (!(e instanceof ErrorIA) || !e.recuperable) throw e;
        primero ??= e;
        if (e.recuperable === "modelo") break;
      }
    }
  }
  throw primero ?? new ErrorIA("No hay modelos de imagen disponibles.");
}

async function leerError(r: Response): Promise<string> {
  try {
    const j = await r.json();
    return j?.error?.message ?? JSON.stringify(j).slice(0, 300);
  } catch {
    return r.statusText;
  }
}

/** Decide si vale la pena reintentar: con otra resolución, o directamente con otro modelo. */
function clasificar(status: number, mensaje: string): Recuperable {
  if (status !== 400 && status !== 404) return null;
  if (/safety|policy|moderation/i.test(mensaje)) return null;
  if (status === 400 && /size|resolution|image_?config|image_?size/i.test(mensaje)) return "tamano";
  if (status === 404 || /model/i.test(mensaje)) return "modelo";
  return null;
}

/**
 * Un 429 puede ser tres cosas distintas, y cada una pide algo distinto al usuario:
 * - «limit: 0» en Google: el plan de la clave (gratuito) no incluye ese modelo → probar el siguiente.
 * - Sin saldo («insufficient_quota», «billing»): hay que pagar; otro modelo no lo arregla.
 * - Demasiadas peticiones seguidas: esperar un poco.
 */
function errorDeCuota(proveedor: "openai" | "gemini", modelo: string, mensaje: string): ErrorIA {
  if (proveedor === "gemini" && /limit:\s*0\b|free_tier/i.test(mensaje)) {
    return new ErrorIA(
      `Tu clave de Google está en el plan gratuito, que no incluye ${modelo}. Activa la facturación de la clave en Google AI Studio (aistudio.google.com → API keys → Set up billing) y vuelve a intentarlo.`,
      402,
      "modelo",
    );
  }
  if (/insufficient_quota|billing|exceeded your current quota/i.test(mensaje)) {
    return new ErrorIA(
      proveedor === "openai"
        ? "Tu cuenta de OpenAI no tiene saldo o llegó a su límite de gasto. Revísalo en platform.openai.com → Billing."
        : "Tu clave de Google llegó al límite de su plan. Revisa la facturación en Google AI Studio.",
      402,
    );
  }
  const espera = mensaje.match(/retry in (\d+(?:\.\d+)?)s/i);
  const cuando = espera ? `en unos ${Math.max(1, Math.ceil(Number(espera[1]) / 60))} min` : "en un momento";
  return new ErrorIA(`Demasiadas solicitudes seguidas a la IA. Vuelve a intentarlo ${cuando}.`, 429);
}

/**
 * Pasa la imagen a JPEG de alta calidad. Una PNG de 2K pesa varios MB y Vercel corta las
 * respuestas de más de 4.5 MB; en JPEG al 92 % el detalle se conserva y ocupa una fracción.
 */
async function aJpeg(base64: string, mime: string): Promise<{ dataUrl: string; lado: number }> {
  try {
    const { data, info } = await sharp(Buffer.from(base64, "base64"))
      .resize({ width: 2048, height: 2048, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    return { dataUrl: `data:image/jpeg;base64,${data.toString("base64")}`, lado: Math.max(info.width, info.height) };
  } catch {
    return { dataUrl: `data:${mime};base64,${base64}`, lado: 0 };
  }
}

async function conOpenAI(modelo: string, lado: number, calidad: Calidad, prompt: string, img: ImagenEntrada): Promise<ImagenSalida> {
  const extension = img.mime === "image/jpeg" ? "jpg" : img.mime === "image/webp" ? "webp" : "png";
  const form = new FormData();
  form.append("model", modelo);
  form.append("prompt", prompt);
  form.append("image", new Blob([Buffer.from(img.base64, "base64")], { type: img.mime }), `boceto.${extension}`);
  form.append("size", `${lado}x${lado}`);
  form.append("quality", calidad === "maxima" ? "high" : "medium");
  form.append("output_format", "png");

  const r = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  if (!r.ok) {
    const mensaje = await leerError(r);
    if (r.status === 429) throw errorDeCuota("openai", modelo, mensaje);
    throw new ErrorIA(`OpenAI (${modelo}): ${mensaje}`, 502, clasificar(r.status, mensaje));
  }
  const j = await r.json();
  const b64: string | undefined = j?.data?.[0]?.b64_json;
  if (!b64) throw new ErrorIA("OpenAI no devolvió ninguna imagen.");
  return { ...(await aJpeg(b64, "image/png")), proveedor: "openai", modelo };
}

interface DatosGemini {
  data?: string;
  mimeType?: string;
  mime_type?: string;
}
interface ParteGemini {
  thought?: boolean;
  inlineData?: DatosGemini;
  inline_data?: DatosGemini;
}

async function conGemini(modelo: string, tam: string | null, prompt: string, img: ImagenEntrada): Promise<ImagenSalida> {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": claveGemini() },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }, { inline_data: { mime_type: img.mime, data: img.base64 } }] }],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"],
        ...(tam ? { imageConfig: { aspectRatio: "1:1", imageSize: tam } } : {}),
      },
    }),
  });
  if (!r.ok) {
    const mensaje = await leerError(r);
    if (r.status === 429) throw errorDeCuota("gemini", modelo, mensaje);
    throw new ErrorIA(`Gemini (${modelo}): ${mensaje}`, 502, clasificar(r.status, mensaje));
  }
  const j = await r.json();
  const partes: ParteGemini[] = j?.candidates?.[0]?.content?.parts ?? [];
  // Los modelos Gemini 3 pueden devolver antes imágenes intermedias de «razonamiento»: la buena es la última.
  const imagenes = partes
    .filter((p) => !p.thought)
    .map((p) => p.inlineData ?? p.inline_data)
    .filter((d) => d?.data);
  const final = imagenes[imagenes.length - 1];
  if (final?.data) {
    return { ...(await aJpeg(final.data, final.mimeType ?? final.mime_type ?? "image/png")), proveedor: "gemini", modelo };
  }
  const motivo = j?.candidates?.[0]?.finishReason ?? j?.promptFeedback?.blockReason;
  throw new ErrorIA(`Gemini no devolvió ninguna imagen${motivo ? ` (${motivo})` : ""}.`);
}

/**
 * Motor propio en fal.ai. Se configura con FAL_KEY, NYVORA_MOTOR_ENDPOINT (el endpoint de edición
 * con LoRA del modelo base que se entrenó) y NYVORA_MOTOR_LORA (la URL de los pesos entrenados).
 * Se mandan los nombres de campo más comunes de fal; cada endpoint ignora los que no usa.
 */
async function conMotorPropio(prompt: string, img: ImagenEntrada): Promise<ImagenSalida> {
  const endpoint = (process.env.NYVORA_MOTOR_ENDPOINT ?? "").replace(/^\/+|\/+$/g, "");
  const boceto = `data:${img.mime};base64,${img.base64}`;
  const lora = process.env.NYVORA_MOTOR_LORA;
  const r = await fetch(`https://fal.run/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Key ${process.env.FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      image_url: boceto,
      image_urls: [boceto],
      ...(lora ? { loras: [{ path: lora, scale: Number(process.env.NYVORA_MOTOR_ESCALA ?? 1) }] } : {}),
      num_images: 1,
      output_format: "png",
    }),
  });
  if (!r.ok) throw new ErrorIA(`Motor NYVORA: ${await leerError(r)}`, r.status === 429 ? 429 : 502);
  const j = await r.json();
  const url: string | undefined = j?.images?.[0]?.url ?? j?.image?.url;
  if (!url) throw new ErrorIA("El motor NYVORA no devolvió ninguna imagen.");

  if (url.startsWith("data:")) {
    const [cabecera, datos] = url.split(",", 2);
    return { ...(await aJpeg(datos, cabecera.slice(5).split(";")[0])), proveedor: "nyvora", modelo: endpoint };
  }
  if (!url.startsWith("https://")) throw new ErrorIA("El motor NYVORA devolvió una dirección de imagen no válida.");
  const descarga = await fetch(url);
  if (!descarga.ok) throw new ErrorIA("No se pudo descargar la imagen del motor NYVORA.");
  const base64 = Buffer.from(await descarga.arrayBuffer()).toString("base64");
  return { ...(await aJpeg(base64, descarga.headers.get("content-type") ?? "image/png")), proveedor: "nyvora", modelo: endpoint };
}
