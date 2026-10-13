// Descarga los pares buenos del Blob privado y arma el zip para entrenar el motor NYVORA.
//
//   npx vercel link
//   npx vercel env pull .env.local
//   npm run dataset:exportar
//
// Deja en la carpeta del proyecto nyvora-dataset-AAAA-MM-DD.zip (para subir al entrenador de
// fal.ai) y nyvora-dataset-AAAA-MM-DD.jsonl (metadatos de cada par, para tu control).

import { createWriteStream } from "node:fs";
import { writeFile } from "node:fs/promises";
import { get } from "@vercel/blob";
import { listarMuestras } from "../src/lib/dataset.ts";
import { empaquetar } from "../src/lib/exportar.ts";

if (!process.env.BLOB_READ_WRITE_TOKEN && !(process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN)) {
  console.error("Faltan las credenciales del Blob. Ejecuta primero: npx vercel link && npx vercel env pull .env.local");
  process.exit(1);
}

const leer = async (ruta: string) => {
  const r = await get(ruta, { access: "private" });
  if (!r || r.statusCode !== 200) throw new Error(`No se pudo leer ${ruta}`);
  return Buffer.from(await new Response(r.stream).arrayBuffer());
};

const muestras = await listarMuestras();
console.log(`Muestras en el almacén: ${muestras.length} (${muestras.filter((m) => m.valoracion === "buena").length} buenas).`);

const fecha = new Date().toISOString().slice(0, 10);
const zip = `nyvora-dataset-${fecha}.zip`;
const salida = createWriteStream(zip);
const { pares, manifiesto } = await empaquetar(muestras, leer, (parte) => salida.write(parte));
await new Promise<void>((resolve) => salida.end(resolve));
await writeFile(`nyvora-dataset-${fecha}.jsonl`, manifiesto);

console.log(`Listo: ${pares} pares en ${zip}.`);
if (pares < 500) console.log("Consejo: con menos de ~500 pares buenos el motor propio todavía no estará a la altura.");
