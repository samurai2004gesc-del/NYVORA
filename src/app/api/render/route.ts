import { codigoValido } from "@/lib/acceso";
import { datasetActivo } from "@/lib/dataset";
import { ErrorIA, generarImagen, proveedorConfigurado, proveedoresDisponibles, type Calidad, type Proveedor } from "@/lib/ia";
import { leerDataUrl } from "@/lib/imagenes";
import { construirInstruccion, construirPrompt, esEspecValida, type ModoRender } from "@/lib/prompts";

// Un render a 2K puede tardar más de un minuto, y si un modelo no está disponible se prueba el siguiente.
export const maxDuration = 300;

const MAX_IMAGEN_BYTES = 3_000_000;

/** Estado del estudio: motores de IA, el de por defecto, si hace falta código y si se guardan datos de entrenamiento. */
export function GET() {
  return Response.json({
    proveedor: proveedorConfigurado(),
    proveedores: proveedoresDisponibles(),
    requiereCodigo: Boolean(process.env.NYVORA_ACCESS_CODE),
    dataset: datasetActivo(),
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

  const modo: ModoRender = cuerpo.modo === "tecnico" ? "tecnico" : "render";
  const calidad: Calidad = cuerpo.calidad === "estandar" ? "estandar" : "maxima";
  if (!esEspecValida(cuerpo.espec)) {
    return Response.json({ error: "Faltan los datos de la pieza." }, { status: 400 });
  }
  const espec = { ...cuerpo.espec, notas: cuerpo.espec.notas.slice(0, 600) };

  // El estudio puede pedir un motor concreto; si no está configurado, se usa el de por defecto.
  const disponibles = proveedoresDisponibles();
  const pedido = cuerpo.proveedor as Proveedor;
  let proveedor = disponibles.includes(pedido) ? pedido : proveedorConfigurado()!;
  // El motor propio solo sabe hacer renders: el plano técnico lo hace uno de los grandes.
  if (modo === "tecnico" && proveedor === "nyvora") {
    const otro = disponibles.find((p) => p !== "nyvora");
    if (!otro) {
      return Response.json({ error: "El motor NYVORA solo hace renders. Configura Gemini u OpenAI para el plano técnico." }, { status: 400 });
    }
    proveedor = otro;
  }

  const imagen = leerDataUrl(cuerpo.imagen);
  if (!imagen) return Response.json({ error: "La imagen debe ser PNG, JPEG o WebP en base64." }, { status: 400 });
  if (imagen.bytes > MAX_IMAGEN_BYTES) {
    return Response.json({ error: "La imagen es demasiado grande (máx. 3 MB)." }, { status: 413 });
  }

  const prompt = proveedor === "nyvora" ? construirInstruccion(espec) : construirPrompt(modo, espec);
  try {
    const salida = await generarImagen(proveedor, prompt, imagen, calidad);
    return Response.json({ imagen: salida.dataUrl, proveedor: salida.proveedor, modelo: salida.modelo, lado: salida.lado, modo });
  } catch (e) {
    console.error("[nyvora/render]", e);
    if (e instanceof ErrorIA) return Response.json({ error: e.message }, { status: e.status });
    return Response.json({ error: "No se pudo conectar con el servicio de IA. Inténtalo de nuevo." }, { status: 502 });
  }
}
