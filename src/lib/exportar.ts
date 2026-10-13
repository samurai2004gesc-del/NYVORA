// Empaqueta el dataset en el formato de los entrenadores de edición de fal.ai:
// cada par comparte raíz → 0001_start.png (boceto), 0001_end.png (render) y 0001.txt (instrucción).

import { Zip, ZipPassThrough } from "fflate";
import sharp from "sharp";
import type { MetaMuestra, Muestra } from "./dataset.ts";

/** Lee un archivo del almacén y devuelve sus bytes. */
export type LectorArchivo = (ruta: string) => Promise<Buffer>;

/** Los entrenadores entrenan a ~1024 px; más grande solo engorda el zip. */
export async function aPng(datos: Buffer, maxLado = 1024): Promise<Buffer> {
  return sharp(datos)
    .resize({ width: maxLado, height: maxLado, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer();
}

/**
 * Escribe el zip por partes (no cabe entero en memoria con cientos de pares) y devuelve
 * cuántos pares entraron y un manifiesto JSONL con los metadatos, que va aparte del zip.
 */
export async function empaquetar(
  muestras: Muestra[],
  leer: LectorArchivo,
  escribir: (parte: Uint8Array) => void,
  maxLado = 1024,
): Promise<{ pares: number; manifiesto: string }> {
  const buenas = muestras.filter((m) => m.valoracion === "buena" && m.boceto && m.render && m.meta).sort((a, b) => +a.fecha - +b.fecha);

  let terminar!: () => void;
  let fallar!: (e: Error) => void;
  const fin = new Promise<void>((resolve, reject) => {
    terminar = resolve;
    fallar = reject;
  });
  const zip = new Zip((err, parte, final) => {
    if (err) return fallar(err);
    escribir(parte);
    if (final) terminar();
  });
  const agregar = (nombre: string, datos: Uint8Array) => {
    // Las PNG ya vienen comprimidas: se guardan tal cual, sin volver a comprimir.
    const archivo = new ZipPassThrough(nombre);
    zip.add(archivo);
    archivo.push(datos, true);
  };

  const lineas: string[] = [];
  for (const [i, m] of buenas.entries()) {
    const [boceto, render, metaBytes] = await Promise.all([leer(m.boceto!), leer(m.render!), leer(m.meta!)]);
    const meta: MetaMuestra = JSON.parse(metaBytes.toString("utf8"));
    const raiz = String(i + 1).padStart(4, "0");
    agregar(`${raiz}_start.png`, await aPng(boceto, maxLado));
    agregar(`${raiz}_end.png`, await aPng(render, maxLado));
    agregar(`${raiz}.txt`, new TextEncoder().encode(meta.instruccion));
    lineas.push(JSON.stringify({ par: raiz, ...meta }));
  }
  zip.end();
  await fin;
  return { pares: buenas.length, manifiesto: lineas.length ? `${lineas.join("\n")}\n` : "" };
}
