import { test } from "node:test";
import assert from "node:assert/strict";
import { agruparMuestras, rutaValida } from "./dataset.ts";

const ID1 = "11111111-1111-4111-8111-111111111111";
const ID2 = "22222222-2222-4222-8222-222222222222";
const d = (min: number) => new Date(Date.UTC(2026, 9, 13, 12, min));

test("agrupa boceto, render y meta de cada muestra y descarta las incompletas", () => {
  const muestras = agruparMuestras([
    { pathname: `dataset/buena/${ID1}/boceto.png`, uploadedAt: d(1) },
    { pathname: `dataset/buena/${ID1}/render.jpg`, uploadedAt: d(1) },
    { pathname: `dataset/buena/${ID1}/meta.json`, uploadedAt: d(2) },
    { pathname: `dataset/mala/${ID2}/boceto.png`, uploadedAt: d(5) },
    { pathname: `dataset/mala/${ID2}/render.jpg`, uploadedAt: d(5) },
    // Sin meta.json: se quedó a medio subir.
    { pathname: "otra-cosa/archivo.txt", uploadedAt: d(9) },
  ]);
  assert.equal(muestras.length, 1);
  assert.equal(muestras[0].id, ID1);
  assert.equal(muestras[0].valoracion, "buena");
  assert.equal(muestras[0].render, `dataset/buena/${ID1}/render.jpg`);
  assert.deepEqual(muestras[0].fecha, d(2));
});

test("solo se pueden leer rutas del dataset con forma válida", () => {
  assert.ok(rutaValida(`dataset/buena/${ID1}/render.jpg`));
  assert.ok(rutaValida(`dataset/mala/${ID2}/boceto.png`));
  assert.ok(!rutaValida(`dataset/buena/${ID1}/../../secreto.json`));
  assert.ok(!rutaValida("dataset/buena/abc/render.jpg"));
  assert.ok(!rutaValida(`otra/buena/${ID1}/render.jpg`));
});
