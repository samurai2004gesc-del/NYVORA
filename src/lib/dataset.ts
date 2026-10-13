// Datos para entrenar el motor propio de NYVORA: pares boceto → render que los usuarios
// valoran con su consentimiento. Se guardan en Vercel Blob privado (solo el servidor los lee).
//
//   dataset/{buena|mala}/{id}/boceto.png|jpg
//   dataset/{buena|mala}/{id}/render.jpg
//   dataset/{buena|mala}/{id}/meta.json   ← se sube al final: sin él la muestra está incompleta

import { del, get, list, put } from "@vercel/blob";
import { extension, type ImagenDecodificada } from "./imagenes.ts";
import type { EspecDiseno } from "./prompts.ts";

export type Valoracion = "buena" | "mala";

export interface MetaMuestra {
  version: 1;
  id: string;
  fecha: string;
  valoracion: Valoracion;
  espec: EspecDiseno;
  /** Instrucción corta: el pie de foto con el que se entrena y luego se usa el motor propio. */
  instruccion: string;
  proveedor?: string;
  modelo?: string;
}

export interface Muestra {
  id: string;
  valoracion: Valoracion;
  fecha: Date;
  boceto?: string;
  render?: string;
  meta?: string;
}

/** En Vercel basta con conectar un Blob store al proyecto; en local, con BLOB_READ_WRITE_TOKEN. */
export const datasetActivo = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

/** Meta de muestras buenas para entrenar una primera versión del motor. */
export const META_MUESTRAS = 500;

const PRIVADO = { access: "private" as const, addRandomSuffix: false, allowOverwrite: true };
const RUTA = /^dataset\/(buena|mala)\/([0-9a-f-]{36})\/(boceto|render|meta)\.(png|jpg|webp|json)$/;

export function rutaValida(ruta: string): boolean {
  return RUTA.test(ruta);
}

/** Agrupa el listado del Blob en muestras completas, de la más nueva a la más antigua. */
export function agruparMuestras(blobs: { pathname: string; uploadedAt: Date }[]): Muestra[] {
  const porId = new Map<string, Muestra>();
  for (const b of blobs) {
    const m = b.pathname.match(RUTA);
    if (!m) continue;
    const [, valoracion, id, archivo] = m;
    const muestra = porId.get(id) ?? { id, valoracion: valoracion as Valoracion, fecha: b.uploadedAt };
    muestra[archivo as "boceto" | "render" | "meta"] = b.pathname;
    if (b.uploadedAt > muestra.fecha) muestra.fecha = b.uploadedAt;
    porId.set(id, muestra);
  }
  return [...porId.values()].filter((m) => m.boceto && m.render && m.meta).sort((a, b) => +b.fecha - +a.fecha);
}

export async function guardarMuestra(meta: MetaMuestra, boceto: ImagenDecodificada, render: ImagenDecodificada) {
  const base = `dataset/${meta.valoracion}/${meta.id}`;
  const subir = (nombre: string, img: ImagenDecodificada) =>
    put(`${base}/${nombre}.${extension(img.mime)}`, Buffer.from(img.base64, "base64"), { ...PRIVADO, contentType: img.mime });
  await Promise.all([subir("boceto", boceto), subir("render", render)]);
  await put(`${base}/meta.json`, JSON.stringify(meta), { ...PRIVADO, contentType: "application/json" });
}

export async function listarMuestras(): Promise<Muestra[]> {
  const blobs: { pathname: string; uploadedAt: Date }[] = [];
  let cursor: string | undefined;
  do {
    const r = await list({ prefix: "dataset/", cursor, limit: 1000 });
    blobs.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor);
  return agruparMuestras(blobs);
}

export async function leerArchivo(ruta: string) {
  const r = await get(ruta, { access: "private" });
  return r && r.statusCode === 200 ? { stream: r.stream, tipo: r.blob.contentType } : null;
}

export async function leerMeta(m: Muestra): Promise<MetaMuestra | null> {
  if (!m.meta) return null;
  const archivo = await leerArchivo(m.meta);
  return archivo ? JSON.parse(await new Response(archivo.stream).text()) : null;
}

export async function borrarMuestra(m: Muestra) {
  await del([m.boceto, m.render, m.meta].filter((r): r is string => Boolean(r)));
}
