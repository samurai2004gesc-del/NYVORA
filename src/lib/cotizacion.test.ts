import { test } from "node:test";
import assert from "node:assert/strict";
import { calcularCotizacion, cotizacionInicial, diametroInteriorUS, pesoArgolla, costoMetal } from "./cotizacion.ts";

const cerca = (a: number, b: number, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test("talla 7 US mide ~17.3 mm por dentro", () => {
  cerca(diametroInteriorUS(7), 17.32, 0.01);
});

test("argolla 2 × 1.6 mm en oro 18k talla 7 pesa ~3 g", () => {
  cerca(pesoArgolla({ tallaUS: 7, anchoMm: 2, espesorMm: 1.6, densidad: 15.5 }), 2.95, 0.05);
});

test("el metal usa la pureza, el spot, el tipo de cambio y la merma", () => {
  // 10 g de 18k (75 %) a 100 USD/g, sin merma → 750 USD; en MXN a 18 → 13 500
  cerca(costoMetal({ metalId: "au18y", pesoGramos: 10, spotUsdGramo: 100, tipoCambio: 1, mermaPct: 0 }), 750);
  cerca(costoMetal({ metalId: "au18y", pesoGramos: 10, spotUsdGramo: 100, tipoCambio: 18, mermaPct: 0 }), 13500);
  cerca(costoMetal({ metalId: "au18y", pesoGramos: 10, spotUsdGramo: 100, tipoCambio: 1, mermaPct: 10 }), 825);
});

test("el margen es sobre el precio de venta", () => {
  const d = { ...cotizacionInicial(), metalId: "au18y", pesoGramos: 0, horas: 0, otros: 0, engastePorPiedra: 0, impuestoPct: 16, margenPct: 50,
    piedras: [{ id: "x", piedra: "diamante", talla: "redonda", quilates: 1, cantidad: 1, precioQuilate: 1000 }] };
  const r = calcularCotizacion(d);
  cerca(r.costo, 1000);
  cerca(r.precio, 2000);
  cerca(r.margen, 1000);
  cerca(r.multiplicador, 2);
  cerca(r.impuesto, 320);
  cerca(r.total, 2320);
});

test("valores vacíos o negativos no rompen el cálculo", () => {
  const d = { ...cotizacionInicial(), pesoGramos: Number.NaN, horas: -3, margenPct: 120, piedras: [] };
  const r = calcularCotizacion(d);
  assert.ok(Number.isFinite(r.precio));
  assert.equal(r.manoObra, 0);
  assert.equal(r.metal, 0);
});
