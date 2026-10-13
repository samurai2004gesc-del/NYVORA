import { createHash, timingSafeEqual } from "node:crypto";
import { ErrorIA, generarImagen, proveedorConfigurado, proveedoresDisponibles, type Calidad, type Proveedor } from "@/lib/ia";
import { construirPrompt, esEspecValida, type ModoRender } from "@/lib/prompts";

// Un render a 2K puede tardar más de un minuto, y si un modelo no está disponible se prueba el siguiente.
export const maxDuration = 300;

const MAX_IMAGEN_BYTES = 3_000_000;

function codigoValido(req: Request): boolean {
  const esperado = process.env.NYVORA_ACCESS_CODE;
  if (!esperado) return true;
  const recibido = req.headers.get("x-nyvora-code") ?? "";
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(recibido), h(esperado));
}

/** Estado del estudio: qué motores de IA hay, cuál va por defecto y si hace falta código de acceso. */
export function GET() {
  return Response.json({
    proveedor: proveedorConfigurado(),
    proveedores: proveedoresDisponibles(),
    requiereCodigo: Boolean(process.env.NYVORA_ACCESS_CODE),
  });
}

export async function POST(req: Request) {
  if (!codigoValido(req)) {
    return Response.json({ error: "Código de acceso incorrecto.", code: "acceso" }, { status: 401 });
  }

  if (!proveedorConfigurado()) {
    return Response.json(
      { error: "Falta configurar OPENAI_API_KEY o GEMINI_API_KEY en Vercel.", code: "demo" },
      { status: 503 },
    );
  }

  let cuerpo: { imagen?: unknown; modo?: unknown; espec?: unknown; proveedor?: unknown; calidad?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }

  // El estudio puede pedir un motor concreto; si no está configurado, se usa el de por defecto.
  const pedido = cuerpo.proveedor as Proveedor;
  const proveedor = proveedoresDisponibles().includes(pedido) ? pedido : proveedorConfigurado()!;
  const calidad: Calidad = cuerpo.calidad === "estandar" ? "estandar" : "maxima";

  const modo: ModoRender = cuerpo.modo === "tecnico" ? "tecnico" : "render";
  if (!esEspecValida(cuerpo.espec)) {
    return Response.json({ error: "Faltan los datos de la pieza." }, { status: 400 });
  }
  const espec = { ...cuerpo.espec, notas: cuerpo.espec.notas.slice(0, 600) };

  const m = typeof cuerpo.imagen === "string" ? cuerpo.imagen.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/) : null;
  if (!m) return Response.json({ error: "La imagen debe ser PNG, JPEG o WebP en base64." }, { status: 400 });
  if ((m[2].length * 3) / 4 > MAX_IMAGEN_BYTES) {
    return Response.json({ error: "La imagen es demasiado grande (máx. 3 MB)." }, { status: 413 });
  }

  try {
    const salida = await generarImagen(proveedor, construirPrompt(modo, espec), { mime: m[1], base64: m[2] }, calidad);
    return Response.json({ imagen: salida.dataUrl, proveedor: salida.proveedor, modelo: salida.modelo, lado: salida.lado, modo });
  } catch (e) {
    console.error("[nyvora/render]", e);
    if (e instanceof ErrorIA) return Response.json({ error: e.message }, { status: e.status });
    return Response.json({ error: "No se pudo conectar con el servicio de IA. Inténtalo de nuevo." }, { status: 502 });
  }
}
