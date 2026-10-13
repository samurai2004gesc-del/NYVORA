import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { unzipSync } from "fflate";
import { empaquetar } from "./exportar.ts";
import type { MetaMuestra, Muestra } from "./dataset.ts";
import { ESPEC_INICIAL } from "./prompts.ts";

const imagen = (lado: number, color: string, formato: "png" | "jpeg") =>
  sharp({ create: { width: lado, height: lado, channels: 3, background: color } })[formato]().toBuffer();

test("arma pares _start/_end/.txt, solo con las buenas y en orden de fecha", async () => {
  const archivos = new Map<string, Buffer>();
  const muestra = async (id: string, valoracion: "buena" | "mala", minuto: number, instruccion: string): Promise<Muestra> => {
    const base = `dataset/${valoracion}/${id}`;
    archivos.set(`${base}/boceto.png`, await imagen(800, "#ffffff", "png"));
    archivos.set(`${base}/render.jpg`, await imagen(2048, "#d9c58f", "jpeg"));
    const meta: MetaMuestra = { version: 1, id, fecha: "", valoracion, espec: ESPEC_INICIAL, instruccion };
    archivos.set(`${base}/meta.json`, Buffer.from(JSON.stringify(meta)));
    return { id, valoracion, fecha: new Date(2026, 9, 13, 12, minuto), boceto: `${base}/boceto.png`, render: `${base}/render.jpg`, meta: `${base}/meta.json` };
  };
  const muestras = [await muestra("b", "buena", 30, "segunda"), await muestra("m", "mala", 10, "mala"), await muestra("a", "buena", 5, "primera")];

  const partes: Uint8Array[] = [];
  const { pares, manifiesto } = await empaquetar(muestras, async (ruta) => archivos.get(ruta)!, (p) => partes.push(p));
  const zip = unzipSync(Buffer.concat(partes));

  assert.equal(pares, 2);
  assert.deepEqual(Object.keys(zip).sort(), ["0001.txt", "0001_end.png", "0001_start.png", "0002.txt", "0002_end.png", "0002_start.png"]);
  assert.equal(new TextDecoder().decode(zip["0001.txt"]), "primera");
  assert.equal(new TextDecoder().decode(zip["0002.txt"]), "segunda");
  const fin = await sharp(Buffer.from(zip["0001_end.png"])).metadata();
  assert.equal(fin.format, "png");
  assert.equal(fin.width, 1024);
  assert.equal(manifiesto.trim().split("\n").length, 2);
  assert.equal(JSON.parse(manifiesto.split("\n")[0]).par, "0001");
});
