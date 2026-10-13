"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, FileText, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import {
  MONEDAS,
  calcularCotizacion,
  cotizacionInicial,
  formatoMoneda,
  pesoArgolla,
  type DatosCotizacion,
  type LineaPiedra,
  type Moneda,
} from "@/lib/cotizacion";
import { FECHA_SPOT, METALES, PIEDRAS, SPOT_USD_GRAMO, TALLAS, metalPorId } from "@/lib/materiales";
import { ESPEC_INICIAL } from "@/lib/prompts";
import { guardarPieza, nuevaPieza, obtenerPieza, type Pieza } from "@/lib/coleccion";

const CLAVE_BORRADOR = "nyvora:cotizacion";
const PIEDRAS_COTIZABLES = PIEDRAS.filter((p) => p.id !== "ninguna");

function Numero({
  etiqueta,
  valor,
  onChange,
  sufijo,
  paso = "any",
  ayuda,
}: {
  etiqueta: string;
  valor: number;
  onChange: (v: number) => void;
  sufijo?: string;
  paso?: string;
  ayuda?: string;
}) {
  return (
    <label className="block">
      <span className="etiqueta">{etiqueta}</span>
      <span className="relative mt-1.5 block">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step={paso}
          className={`campo tabular-nums ${sufijo ? "pr-14" : ""}`}
          value={Number.isFinite(valor) ? valor : ""}
          onChange={(e) => onChange(e.target.value === "" ? Number.NaN : Number(e.target.value))}
        />
        {sufijo && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-humo">{sufijo}</span>}
      </span>
      {ayuda && <span className="mt-1 block text-xs text-humo">{ayuda}</span>}
    </label>
  );
}

function Bloque({ titulo, children, extra }: { titulo: string; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <section className="tarjeta p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="titulo-display text-2xl">{titulo}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}

function Cotizador() {
  const router = useRouter();
  const piezaId = useSearchParams().get("pieza");
  const [datos, setDatos] = useState<DatosCotizacion>(() => cotizacionInicial());
  const [pieza, setPieza] = useState<Pieza | null>(null);
  const [cargado, setCargado] = useState(false);
  const [estimador, setEstimador] = useState({ abierto: false, talla: 7, ancho: 2.5, espesor: 1.7 });
  const [aviso, setAviso] = useState<string | null>(null);
  const r = useMemo(() => calcularCotizacion(datos), [datos]);
  const metal = metalPorId(datos.metalId);
  const m = (v: number) => formatoMoneda(v, datos.moneda);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      if (piezaId) {
        const p = await obtenerPieza(piezaId).catch(() => undefined);
        if (cancelado) return;
        if (p) {
          setPieza(p);
          if (p.cotizacion) {
            setDatos(p.cotizacion.datos);
          } else {
            // Primera cotización de la pieza: arrancamos con su metal y su piedra principal.
            const base = cotizacionInicial();
            const principal = base.piedras[0];
            setDatos({
              ...base,
              metalId: p.espec.metalId,
              spotUsdGramo: SPOT_USD_GRAMO[metalPorId(p.espec.metalId).base],
              piedras: p.espec.piedra === "ninguna" ? [] : [{ ...principal, piedra: p.espec.piedra, talla: p.espec.talla }],
            });
          }
        }
      } else {
        try {
          const borrador = localStorage.getItem(CLAVE_BORRADOR);
          if (borrador) setDatos({ ...cotizacionInicial(), ...JSON.parse(borrador) });
        } catch {}
      }
      setCargado(true);
    })();
    return () => {
      cancelado = true;
    };
  }, [piezaId]);

  useEffect(() => {
    if (!cargado || pieza) return;
    try {
      localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(datos));
    } catch {}
  }, [datos, cargado, pieza]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  const poner = <K extends keyof DatosCotizacion>(k: K, v: DatosCotizacion[K]) => setDatos((d) => ({ ...d, [k]: v }));

  const cambiarMoneda = (moneda: Moneda) =>
    setDatos((d) => {
      const tipoCambio = MONEDAS.find((x) => x.id === moneda)!.tipoCambio;
      const f = d.tipoCambio > 0 ? tipoCambio / d.tipoCambio : 1;
      const conv = (v: number) => Math.round(v * f * 100) / 100;
      return {
        ...d,
        moneda,
        tipoCambio,
        tarifaHora: conv(d.tarifaHora),
        engastePorPiedra: conv(d.engastePorPiedra),
        otros: conv(d.otros),
        piedras: d.piedras.map((p) => ({ ...p, precioQuilate: conv(p.precioQuilate) })),
      };
    });

  const cambiarMetal = (id: string) =>
    setDatos((d) => {
      const nueva = metalPorId(id).base;
      const cambiaBase = nueva !== metalPorId(d.metalId).base;
      return { ...d, metalId: id, spotUsdGramo: cambiaBase ? SPOT_USD_GRAMO[nueva] : d.spotUsdGramo };
    });

  const cambiarPiedra = (id: string, cambios: Partial<LineaPiedra>) => poner("piedras", datos.piedras.map((p) => (p.id === id ? { ...p, ...cambios } : p)));

  const pesoEstimado = pesoArgolla({ tallaUS: estimador.talla, anchoMm: estimador.ancho, espesorMm: estimador.espesor, densidad: metal.densidad });

  async function guardar() {
    try {
      const destino = pieza ?? nuevaPieza({ ...ESPEC_INICIAL, metalId: datos.metalId }, `Cotización ${new Date().toLocaleDateString("es-MX")}`);
      const guardada = await guardarPieza({ ...destino, cotizacion: { datos, resultado: r } });
      setPieza(guardada);
      setAviso(pieza ? "Cotización actualizada." : "Guardada como pieza nueva en tu colección.");
      if (!piezaId) router.replace(`/cotizador?pieza=${guardada.id}`);
    } catch {
      setAviso("No se pudo guardar en este navegador.");
    }
  }

  const tarjetas = [
    { t: "Metal", v: r.metal },
    { t: "Piedras", v: r.piedras },
    { t: "Taller", v: r.manoObra + r.engaste + r.otros },
    { t: `Margen (${Math.min(Number.isFinite(datos.margenPct) ? datos.margenPct : 0, 95)}%)`, v: r.margen },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="etiqueta text-oro-oscuro">Cotizador</p>
      <h1 className="titulo-display mt-2 text-4xl sm:text-5xl">{pieza ? pieza.nombre : "Cotiza tu pieza al gramo"}</h1>
      {pieza && (
        <p className="mt-2 text-sm text-humo">
          Cotizando una pieza de tu colección ·{" "}
          <Link href={`/propuesta/${pieza.id}`} className="text-oro-oscuro underline-offset-4 hover:underline">
            ver propuesta
          </Link>
        </p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Bloque titulo="Metal">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="etiqueta">Aleación</span>
                <select className="campo mt-1.5" value={datos.metalId} onChange={(e) => cambiarMetal(e.target.value)}>
                  {METALES.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <Numero etiqueta="Peso de la pieza" valor={datos.pesoGramos} onChange={(v) => poner("pesoGramos", v)} sufijo="g" />
              <Numero
                etiqueta={`Precio spot del ${metal.base}`}
                valor={datos.spotUsdGramo}
                onChange={(v) => poner("spotUsdGramo", v)}
                sufijo="USD/g"
                ayuda={`Metal fino. Referencia: ${SPOT_USD_GRAMO[metal.base]} USD/g (${FECHA_SPOT}). Actualízalo con el precio del día.`}
              />
              <Numero etiqueta="Merma de fundición" valor={datos.mermaPct} onChange={(v) => poner("mermaPct", v)} sufijo="%" />
            </div>

            <div className="mt-4 rounded-xl border border-linea bg-marfil/60">
              <button
                type="button"
                className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
                aria-expanded={estimador.abierto}
                onClick={() => setEstimador((e) => ({ ...e, abierto: !e.abierto }))}
              >
                Estimar el peso de una argolla
                <ChevronDown size={16} className={`transition-transform ${estimador.abierto ? "rotate-180" : ""}`} />
              </button>
              {estimador.abierto && (
                <div className="border-t border-linea px-4 pt-3 pb-4">
                  <div className="grid grid-cols-3 gap-3">
                    <Numero etiqueta="Talla (US/MX)" valor={estimador.talla} paso="0.25" onChange={(v) => setEstimador((e) => ({ ...e, talla: v }))} />
                    <Numero etiqueta="Ancho" valor={estimador.ancho} onChange={(v) => setEstimador((e) => ({ ...e, ancho: v }))} sufijo="mm" />
                    <Numero etiqueta="Grosor" valor={estimador.espesor} onChange={(v) => setEstimador((e) => ({ ...e, espesor: v }))} sufijo="mm" />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm">
                      ≈ <strong className="tabular-nums">{pesoEstimado.toFixed(2)} g</strong> de {metal.nombre.toLowerCase()}
                      <span className="block text-xs text-humo">Argolla lisa. Suma aparte la cabeza o montura.</span>
                    </p>
                    <button type="button" className="btn btn-secundario btn-chico" onClick={() => poner("pesoGramos", Math.round(pesoEstimado * 100) / 100)}>
                      Usar este peso
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Bloque>

          <Bloque
            titulo="Piedras"
            extra={
              <button
                type="button"
                className="btn btn-secundario btn-chico"
                onClick={() =>
                  poner("piedras", [
                    ...datos.piedras,
                    { id: crypto.randomUUID(), piedra: "diamante", talla: "redonda", quilates: 0.1, cantidad: 1, precioQuilate: Math.round(900 * datos.tipoCambio) },
                  ])
                }
              >
                <Plus size={15} /> Añadir
              </button>
            }
          >
            {datos.piedras.length === 0 && <p className="text-sm text-humo">Pieza sin piedras. Pulsa «Añadir» para sumar una.</p>}
            <div className="space-y-3">
              {datos.piedras.map((p) => (
                <div key={p.id} className="grid grid-cols-2 gap-3 rounded-xl border border-linea p-3 md:grid-cols-[1.1fr_1.1fr_0.8fr_0.7fr_1fr_auto] md:items-end">
                  <label className="block">
                    <span className="etiqueta">Piedra</span>
                    <select className="campo mt-1.5" value={p.piedra} onChange={(e) => cambiarPiedra(p.id, { piedra: e.target.value })}>
                      {PIEDRAS_COTIZABLES.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="etiqueta">Talla</span>
                    <select className="campo mt-1.5" value={p.talla} onChange={(e) => cambiarPiedra(p.id, { talla: e.target.value })}>
                      {TALLAS.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.nombre}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Numero etiqueta="Quilates" valor={p.quilates} paso="0.01" onChange={(v) => cambiarPiedra(p.id, { quilates: v })} />
                  <Numero etiqueta="Cant." valor={p.cantidad} paso="1" onChange={(v) => cambiarPiedra(p.id, { cantidad: v })} />
                  <Numero etiqueta={`${datos.moneda}/ct`} valor={p.precioQuilate} onChange={(v) => cambiarPiedra(p.id, { precioQuilate: v })} />
                  <div className="flex items-center justify-between gap-2 md:flex-col md:items-end">
                    <span className="text-sm font-semibold tabular-nums">{m((p.quilates || 0) * (p.cantidad || 0) * (p.precioQuilate || 0))}</span>
                    <button
                      type="button"
                      className="rounded-full p-1.5 text-humo hover:bg-red-50 hover:text-red-700"
                      aria-label="Quitar piedra"
                      onClick={() => poner("piedras", datos.piedras.filter((x) => x.id !== p.id))}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Bloque>

          <Bloque titulo="Taller">
            <div className="grid gap-4 sm:grid-cols-2">
              <Numero etiqueta="Horas de trabajo" valor={datos.horas} onChange={(v) => poner("horas", v)} sufijo="h" />
              <Numero etiqueta="Tarifa por hora" valor={datos.tarifaHora} onChange={(v) => poner("tarifaHora", v)} sufijo={datos.moneda} />
              <Numero etiqueta="Engaste por piedra" valor={datos.engastePorPiedra} onChange={(v) => poner("engastePorPiedra", v)} sufijo={datos.moneda} />
              <Numero etiqueta="Otros costos" valor={datos.otros} onChange={(v) => poner("otros", v)} sufijo={datos.moneda} ayuda="Rodio, grabado, certificado, estuche…" />
            </div>
          </Bloque>

          <Bloque titulo="Precio">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="etiqueta">Moneda</span>
                <select className="campo mt-1.5" value={datos.moneda} onChange={(e) => cambiarMoneda(e.target.value as Moneda)}>
                  {MONEDAS.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.nombre}
                    </option>
                  ))}
                </select>
              </label>
              {datos.moneda !== "USD" && (
                <Numero etiqueta={`Tipo de cambio (1 USD en ${datos.moneda})`} valor={datos.tipoCambio} onChange={(v) => poner("tipoCambio", v)} ayuda="Aproximado. Ajústalo al del día." />
              )}
              <Numero etiqueta="Margen sobre el precio de venta" valor={datos.margenPct} onChange={(v) => poner("margenPct", v)} sufijo="%" />
              <Numero etiqueta="Impuesto (IVA)" valor={datos.impuestoPct} onChange={(v) => poner("impuestoPct", v)} sufijo="%" ayuda="Déjalo en 0 si cotizas sin impuestos." />
            </div>
          </Bloque>
        </div>

        <aside className="h-fit space-y-4 lg:sticky lg:top-24">
          <div className="tarjeta p-5">
            <div className="grid grid-cols-2 gap-2.5">
              {tarjetas.map((x) => (
                <div key={x.t} className="rounded-xl border border-linea p-3">
                  <p className="etiqueta text-[0.6rem] tracking-[0.1em] whitespace-nowrap">{x.t}</p>
                  <p className="cifra mt-1 text-xl">{m(x.v)}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl bg-noche p-4 text-white">
              <p className="etiqueta text-oro-claro">Precio de venta · {datos.moneda}</p>
              <p className="cifra mt-1 text-4xl">{m(r.precio)}</p>
              {r.impuesto > 0 && <p className="mt-1 text-sm text-white/70 tabular-nums">Con IVA: {m(r.total)}</p>}
            </div>
            <dl className="mt-4 space-y-1.5 text-sm">
              {[
                [`Metal (${Number.isFinite(datos.pesoGramos) ? datos.pesoGramos : 0} g · ${metal.nombre})`, r.metal],
                [`Piedras (${r.numPiedras})`, r.piedras],
                ["Engaste", r.engaste],
                ["Mano de obra", r.manoObra],
                ["Otros", r.otros],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-3">
                  <dt className="text-humo">{k}</dt>
                  <dd className="tabular-nums">{m(v as number)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-linea pt-2 font-semibold">
                <dt>Costo total</dt>
                <dd className="tabular-nums">{m(r.costo)}</dd>
              </div>
              <div className="flex justify-between gap-3 text-humo">
                <dt>Multiplicador</dt>
                <dd className="tabular-nums">× {r.multiplicador.toFixed(2)}</dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" className="btn btn-primario" onClick={guardar}>
              <Save size={16} /> {pieza ? "Guardar cotización" : "Guardar como pieza nueva"}
            </button>
            {pieza && (
              <Link href={`/propuesta/${pieza.id}`} className="btn btn-secundario">
                <FileText size={16} /> Ver propuesta para el cliente
              </Link>
            )}
            {!pieza && (
              <button type="button" className="btn btn-secundario" onClick={() => setDatos(cotizacionInicial(datos.moneda))}>
                <RotateCcw size={16} /> Restablecer ejemplo
              </button>
            )}
          </div>
          {aviso && (
            <p className="rounded-xl bg-noche px-4 py-3 text-sm text-white" role="status">
              {aviso}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function PaginaCotizador() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-10 text-humo sm:px-6">Cargando cotizador…</div>}>
      <Cotizador />
    </Suspense>
  );
}
