// Proveedores de IA de imagen. Solo se usa en el servidor (la clave nunca llega al navegador).

export type Proveedor = "openai" | "gemini";

export interface ImagenEntrada {
  mime: string;
  base64: string;
}

export interface ImagenSalida {
  dataUrl: string;
  proveedor: Proveedor;
  modelo: string;
}

export class ErrorIA extends Error {
  readonly status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

const claveGemini = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";

export function proveedorConfigurado(): Proveedor | null {
  const elegido = process.env.NYVORA_IMAGE_PROVIDER?.toLowerCase();
  if (elegido === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (elegido === "gemini" && claveGemini()) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (claveGemini()) return "gemini";
  return null;
}

export async function generarImagen(proveedor: Proveedor, prompt: string, img: ImagenEntrada): Promise<ImagenSalida> {
  return proveedor === "openai" ? conOpenAI(prompt, img) : conGemini(prompt, img);
}

async function leerError(r: Response): Promise<string> {
  try {
    const j = await r.json();
    return j?.error?.message ?? JSON.stringify(j).slice(0, 300);
  } catch {
    return r.statusText;
  }
}

async function conOpenAI(prompt: string, img: ImagenEntrada): Promise<ImagenSalida> {
  const modelo = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const extension = img.mime === "image/jpeg" ? "jpg" : "png";
  const form = new FormData();
  form.append("model", modelo);
  form.append("prompt", prompt);
  form.append("image", new Blob([Buffer.from(img.base64, "base64")], { type: img.mime }), `boceto.${extension}`);
  form.append("size", "1024x1024");
  form.append("quality", process.env.OPENAI_IMAGE_QUALITY || "medium");
  // JPEG mantiene la respuesta muy por debajo del límite de 4.5 MB de Vercel.
  form.append("output_format", "jpeg");

  const r = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  if (!r.ok) throw new ErrorIA(`OpenAI: ${await leerError(r)}`, r.status === 429 ? 429 : 502);
  const j = await r.json();
  const b64: string | undefined = j?.data?.[0]?.b64_json;
  if (!b64) throw new ErrorIA("OpenAI no devolvió ninguna imagen.");
  return { dataUrl: `data:image/jpeg;base64,${b64}`, proveedor: "openai", modelo };
}

async function conGemini(prompt: string, img: ImagenEntrada): Promise<ImagenSalida> {
  const modelo = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": claveGemini() },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }, { inline_data: { mime_type: img.mime, data: img.base64 } }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });
  if (!r.ok) throw new ErrorIA(`Gemini: ${await leerError(r)}`, r.status === 429 ? 429 : 502);
  const j = await r.json();
  const partes: Record<string, { data?: string; mimeType?: string; mime_type?: string }>[] = j?.candidates?.[0]?.content?.parts ?? [];
  for (const p of partes) {
    const datos = p.inlineData ?? p.inline_data;
    if (datos?.data) {
      const mime = datos.mimeType ?? datos.mime_type ?? "image/png";
      return { dataUrl: `data:${mime};base64,${datos.data}`, proveedor: "gemini", modelo };
    }
  }
  const motivo = j?.candidates?.[0]?.finishReason ?? j?.promptFeedback?.blockReason;
  throw new ErrorIA(`Gemini no devolvió ninguna imagen${motivo ? ` (${motivo})` : ""}.`);
}
