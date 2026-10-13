import { adminValido } from "@/lib/acceso";
import { datasetActivo, leerArchivo, rutaValida } from "@/lib/dataset";

/** Sirve una imagen del dataset privado al panel de datos. Solo con el código de administración. */
export async function GET(req: Request) {
  if (!adminValido(req)) return new Response("No autorizado", { status: 401 });
  if (!datasetActivo()) return new Response("Sin almacén", { status: 503 });
  const ruta = new URL(req.url).searchParams.get("ruta") ?? "";
  if (!rutaValida(ruta)) return new Response("Ruta inválida", { status: 400 });
  const archivo = await leerArchivo(ruta);
  if (!archivo) return new Response("No encontrado", { status: 404 });
  return new Response(archivo.stream, {
    headers: { "Content-Type": archivo.tipo, "Cache-Control": "private, max-age=3600" },
  });
}
