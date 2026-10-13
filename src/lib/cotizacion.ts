// Cálculo de cotizaciones de joyería: metal, piedras, mano de obra y margen.
// Funciones puras para poder probarlas sin navegador.

import { metalPorId, SPOT_USD_GRAMO } from "./materiales.ts";

export type Moneda = "USD" | "MXN" | "EUR";

/** Tipo de cambio aproximado (unidades de la moneda por 1 USD). El usuario lo ajusta. */
export const MONEDAS: { id: Moneda; nombre: string; tipoCambio: number }[] = [
  { id: "USD", nombre: "Dólar (USD)", tipoCambio: 1 },
  { id: "MXN", nombre: "Peso mexicano (MXN)", tipoCambio: 18.3 },
  { id: "EUR", nombre: "Euro (EUR)", tipoCambio: 0.92 },
];

export interface LineaPiedra {
  id: string;
  piedra: string;
  talla: string;
  quilates: number;
  cantidad: number;
  /** Precio por quilate, en la moneda de la cotización. */
  precioQuilate: number;
}

export interface DatosCotizacion {
  moneda: Moneda;
  /** Unidades de la moneda por 1 USD (para convertir el spot del metal). */
  tipoCambio: number;
  metalId: string;
  pesoGramos: number;
  /** Precio del metal fino en USD por gramo. */
  spotUsdGramo: number;
  /** Pérdida de metal en fundición y acabado, en %. */
  mermaPct: number;
  horas: number;
  tarifaHora: number;
  engastePorPiedra: number;
  /** Rodio, grabado, certificados, empaque… */
  otros: number;
  piedras: LineaPiedra[];
  /** Margen bruto sobre el precio de venta, en %. */
  margenPct: number;
  impuestoPct: number;
}

export interface ResultadoCotizacion {
  metal: number;
  piedras: number;
  numPiedras: number;
  engaste: number;
  manoObra: number;
  otros: number;
  costo: number;
  margen: number;
  precio: number;
  impuesto: number;
  total: number;
  /** Precio / costo: el "x2.5" que usan muchos joyeros. */
  multiplicador: number;
}

const n = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);

export function costoMetal(d: Pick<DatosCotizacion, "metalId" | "pesoGramos" | "spotUsdGramo" | "tipoCambio" | "mermaPct">): number {
  const metal = metalPorId(d.metalId);
  return n(d.pesoGramos) * metal.pureza * n(d.spotUsdGramo) * n(d.tipoCambio) * (1 + n(d.mermaPct) / 100);
}

export function calcularCotizacion(d: DatosCotizacion): ResultadoCotizacion {
  const metal = costoMetal(d);
  let piedras = 0;
  let numPiedras = 0;
  for (const p of d.piedras) {
    piedras += n(p.quilates) * n(p.cantidad) * n(p.precioQuilate);
    numPiedras += Math.round(n(p.cantidad));
  }
  const engaste = numPiedras * n(d.engastePorPiedra);
  const manoObra = n(d.horas) * n(d.tarifaHora);
  const otros = n(d.otros);
  const costo = metal + piedras + engaste + manoObra + otros;

  const margenPct = Math.min(n(d.margenPct), 95);
  const precio = costo / (1 - margenPct / 100);
  const impuesto = (precio * n(d.impuestoPct)) / 100;

  return {
    metal,
    piedras,
    numPiedras,
    engaste,
    manoObra,
    otros,
    costo,
    margen: precio - costo,
    precio,
    impuesto,
    total: precio + impuesto,
    multiplicador: costo > 0 ? precio / costo : 0,
  };
}

/** Diámetro interior (mm) de una talla de anillo estadounidense (también la usada en México). */
export function diametroInteriorUS(talla: number): number {
  return 11.63 + 0.8128 * talla;
}

/** Peso estimado (g) de una argolla lisa de sección rectangular. */
export function pesoArgolla(opts: { tallaUS: number; anchoMm: number; espesorMm: number; densidad: number }): number {
  const d = diametroInteriorUS(opts.tallaUS);
  const volumenMm3 = Math.PI * (d + n(opts.espesorMm)) * n(opts.anchoMm) * n(opts.espesorMm);
  return (volumenMm3 / 1000) * n(opts.densidad);
}

export function cotizacionInicial(moneda: Moneda = "USD"): DatosCotizacion {
  const tipoCambio = MONEDAS.find((m) => m.id === moneda)?.tipoCambio ?? 1;
  const metalId = "au18y";
  return {
    moneda,
    tipoCambio,
    metalId,
    pesoGramos: 4.8,
    spotUsdGramo: SPOT_USD_GRAMO[metalPorId(metalId).base],
    mermaPct: 7,
    horas: 10,
    tarifaHora: Math.round(45 * tipoCambio),
    engastePorPiedra: Math.round(15 * tipoCambio),
    otros: Math.round(60 * tipoCambio),
    piedras: [
      { id: "p1", piedra: "diamante", talla: "redonda", quilates: 1, cantidad: 1, precioQuilate: Math.round(4500 * tipoCambio) },
      { id: "p2", piedra: "diamante", talla: "redonda", quilates: 0.02, cantidad: 20, precioQuilate: Math.round(900 * tipoCambio) },
    ],
    margenPct: 45,
    impuestoPct: 0,
  };
}

export function formatoMoneda(valor: number, moneda: Moneda, decimales = 0): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: moneda,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(Number.isFinite(valor) ? valor : 0);
}
