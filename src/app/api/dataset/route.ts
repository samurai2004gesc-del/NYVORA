import { adminValido, codigoValido } from "@/lib/acceso";
import { META_MUESTRAS, borrarMuestra, datasetActivo, guardarMuestra, leerMeta, listarMuestras, type MetaMuestra } from "@/lib/dataset";
import { leerDataUrl } from "@/lib/imagenes";
import { construirInstruccion, esEspecValida } from "@/lib/prompts";

const MAX_BYTES = 2_000_000;
const sinAlmacen = () =>
  Response.json({ error: "Falta conectar un Blob store privado al proyecto en Vercel.", code: "sin-almacen" }, { status: 503 });

/** El estudio manda un par boceto → render que el usuario valoró y aceptó compartir. */
export async function POST(req: Request) {
  if (!codigoValido(req)) return Response.json({ error: "Código de acceso incorrecto.", code: "acceso" }, { status: 401 });
  if (!datasetActivo()) return sinAlmacen();

  let c: Record<string, unknown>;
  try {
    c = await req.json();
  } catch {
    return Response.json({ error: "Cuerpo JSON inválido." }, { status: 400 });
  }
  if (c.consentimiento !== true) return Response.json({ error: "Falta el consentimiento." }, { status: 400 });
  if (c.valoracion !== "buena" && c.valoracion !== "mala") return Response.json({ error: "Valoración inválida." }, { status: 400 });
  if (!esEspecValida(c.espec)) return Response.json({ error: "Faltan los datos de la pieza." }, { status: 400 });

  const boceto = leerDataUrl(c.boceto);
  const render = leerDataUrl(c.render);
  if (!boceto || !render) return Response.json({ error: "Las imágenes deben ser PNG, JPEG o WebP en base64." }, { status: 400 });
  if (boceto.bytes > MAX_BYTES || render.bytes > MAX_BYTES) return Response.json({ error: "Imagen demasiado grande." }, { status: 413 });

  const espec = { ...c.espec, notas: c.espec.notas.slice(0, 600) };
  const texto = (v: unknown) => (typeof v === "string" ? v.slice(0, 80) : undefined);
  const meta: MetaMuestra = {
    version: 1,
    id: crypto.randomUUID(),
    fecha: new Date().toISOString(),
    valoracion: c.valoracion,
    espec,
    instruccion: construirInstruccion(espec),
    proveedor: texto(c.proveedor),
    modelo: texto(c.modelo),
  };
  try {
    await guardarMuestra(meta, boceto, render);
    return Response.json({ ok: true, id: meta.id });
  } catch (e) {
    console.error("[nyvora/dataset]", e);
    return Response.json({ error: "No se pudo guardar la muestra." }, { status: 502 });
  }
}

/** Panel de datos: cuántas muestras hay y las más recientes. */
export async function GET(req: Request) {
  if (!adminValido(req)) return Response.json({ error: "Código de administración incorrecto." }, { status: 401 });
  if (!datasetActivo()) return sinAlmacen();
  const muestras = await listarMuestras();
  const recientes = await Promise.all(
    muestras.slice(0, 24).map(async (m) => {
      const meta = await leerMeta(m).catch(() => null);
      return { id: m.id, valoracion: m.valoracion, fecha: m.fecha, boceto: m.boceto, render: m.render, espec: meta?.espec, modelo: meta?.modelo };
    }),
  );
  return Response.json({
    buenas: muestras.filter((m) => m.valoracion === "buena").length,
    malas: muestras.filter((m) => m.valoracion === "mala").length,
    meta: META_MUESTRAS,
    recientes,
  });
}

/** Borra una muestra (para quitar las que no deben entrar al entrenamiento). */
export async function DELETE(req: Request) {
  if (!adminValido(req)) return Response.json({ error: "Código de administración incorrecto." }, { status: 401 });
  if (!datasetActivo()) return sinAlmacen();
  const id = new URL(req.url).searchParams.get("id");
  const muestra = (await listarMuestras()).find((m) => m.id === id);
  if (!muestra) return Response.json({ error: "No existe esa muestra." }, { status: 404 });
  await borrarMuestra(muestra);
  return Response.json({ ok: true });
}
