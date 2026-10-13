"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Calculator, Printer } from "lucide-react";
import { Logo } from "@/components/Logo";
import { guardarPieza, obtenerPieza, type Pieza } from "@/lib/coleccion";
import { formatoMoneda } from "@/lib/cotizacion";
import { ESTILOS, PIEDRAS, TALLAS, TIPOS_PIEZA, metalPorId, nombrePorId } from "@/lib/materiales";

type Vista = "render" | "tecnico" | "boceto";
const NOMBRES_VISTA: Record<Vista, string> = { render: "Render", tecnico: "Plano técnico", boceto: "Boceto" };

/** Título que se edita en el sitio y crece en varias líneas si el nombre es largo. */
function TituloEditable({ valor, onChange, onBlur }: { valor: string; onChange: (v: string) => void; onBlur: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [valor]);
  return (
    <textarea
      ref={ref}
      rows={1}
      className="titulo-display -mx-1 mt-2 w-full resize-none overflow-hidden rounded-lg border border-transparent bg-transparent px-1 text-4xl hover:border-linea focus:border-oro focus:outline-none sm:text-5xl print:border-0"
      value={valor}
      onChange={(ev) => onChange(ev.target.value.replace(/\n/g, " "))}
      onKeyDown={(ev) => ev.key === "Enter" && ev.currentTarget.blur()}
      onBlur={onBlur}
      aria-label="Nombre de la pieza"
    />
  );
}

export default function Propuesta() {
  const { id } = useParams<{ id: string }>();
  const [pieza, setPieza] = useState<Pieza | null | undefined>(undefined);
  const [vista, setVista] = useState<Vista>("render");
  const [desglose, setDesglose] = useState(false);

  useEffect(() => {
    obtenerPieza(id)
      .then((p) => {
        setPieza(p ?? null);
        if (p) {
          setVista(p.render ? "render" : p.tecnico ? "tecnico" : "boceto");
          document.title = `${p.nombre} · Propuesta`;
        }
      })
      .catch(() => setPieza(null));
  }, [id]);

  if (pieza === undefined) return <p className="mx-auto max-w-5xl px-4 py-16 text-humo sm:px-6">Cargando propuesta…</p>;

  if (pieza === null) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center sm:px-6">
        <Logo />
        <h1 className="titulo-display mt-8 text-3xl">Esta propuesta no está en este navegador</h1>
        <p className="mt-3 text-humo">
          Por ahora las piezas se guardan en el navegador donde se crearon. Para compartir una propuesta, ábrela allí y usa «Imprimir / PDF».
        </p>
        <Link href="/coleccion" className="btn btn-primario mt-8">
          Ir a mi colección
        </Link>
      </div>
    );
  }

  const actualizar = (cambios: Partial<Pieza>) => {
    const nueva = { ...pieza, ...cambios };
    setPieza(nueva);
    return nueva;
  };
  const persistir = () => guardarPieza(pieza).catch(() => undefined);

  const vistas = (["render", "tecnico", "boceto"] as Vista[]).filter((v) => pieza[v]);
  const e = pieza.espec;
  const cot = pieza.cotizacion;
  const metal = metalPorId(cot?.datos.metalId ?? e.metalId);
  const sinPiedra = e.piedra === "ninguna";
  const subtitulo = [sinPiedra ? null : `${nombrePorId(PIEDRAS, e.piedra)} ${nombrePorId(TALLAS, e.talla).toLowerCase()}`, metal.nombre].filter(Boolean).join(" · ");
  const ficha = [
    ...(sinPiedra ? [] : [["Piedra", nombrePorId(PIEDRAS, e.piedra)], ["Talla", nombrePorId(TALLAS, e.talla)]]),
    ["Metal", metal.nombre],
    ["Estilo", nombrePorId(ESTILOS, e.estilo)],
    ...(cot && Number.isFinite(cot.datos.pesoGramos) && cot.datos.pesoGramos > 0 ? [["Peso aprox.", `${cot.datos.pesoGramos} g`]] : []),
    ...(cot && cot.resultado.numPiedras > 0 ? [["Piedras", `${cot.resultado.numPiedras}`]] : []),
  ];

  // Desglose para el cliente: cada partida absorbe su parte proporcional del margen.
  const r = cot?.resultado;
  const f = r && r.costo > 0 ? r.precio / r.costo : 0;
  const partidas = r
    ? [
        ["Metal", r.metal * f],
        ["Piedras", r.piedras * f],
        ["Hechura y engaste", (r.manoObra + r.engaste + r.otros) * f],
      ].filter(([, v]) => (v as number) > 0)
    : [];
  const moneda = cot?.datos.moneda ?? "USD";

  return (
    <div className="min-h-dvh bg-papel">
      <div className="no-imprimir sticky top-0 z-30 border-b border-linea bg-marfil/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/coleccion" className="flex items-center gap-1.5 text-sm text-tinta-2 hover:text-tinta">
            <ArrowLeft size={16} /> Colección
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {cot && (
              <label className="mr-2 flex items-center gap-2 text-sm text-tinta-2">
                <input type="checkbox" checked={desglose} onChange={(ev) => setDesglose(ev.target.checked)} className="accent-[#121829]" />
                Mostrar desglose
              </label>
            )}
            <Link href={`/cotizador?pieza=${pieza.id}`} className="btn btn-secundario btn-chico">
              <Calculator size={15} /> {cot ? "Editar precio" : "Cotizar"}
            </Link>
            <button type="button" onClick={() => window.print()} className="btn btn-primario btn-chico">
              <Printer size={15} /> Imprimir / PDF
            </button>
          </div>
        </div>
      </div>

      <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6 print:max-w-none print:p-0">
        <header className="flex items-center justify-between border-b border-linea pb-6">
          <Logo />
          <p className="etiqueta">Propuesta de diseño</p>
        </header>

        <div className="mt-8 grid gap-10 md:grid-cols-2 print:grid-cols-2">
          <div>
            <div className="aspect-square overflow-hidden rounded-2xl border border-linea bg-marfil">
              {pieza[vista] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pieza[vista]} alt={`${NOMBRES_VISTA[vista]} de ${pieza.nombre}`} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-center text-humo">Esta pieza aún no tiene imagen. Créala en el estudio.</div>
              )}
            </div>
            {vistas.length > 1 && (
              <div className="no-imprimir mt-3 flex gap-2">
                {vistas.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVista(v)}
                    className={`h-20 w-20 overflow-hidden rounded-xl border-2 bg-marfil ${vista === v ? "border-oro" : "border-transparent opacity-70 hover:opacity-100"}`}
                    aria-label={NOMBRES_VISTA[v]}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pieza[v]} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col">
            <p className="etiqueta">{nombrePorId(TIPOS_PIEZA, e.tipo)}</p>
            <TituloEditable valor={pieza.nombre} onChange={(nombre) => actualizar({ nombre })} onBlur={persistir} />
            <p className="mt-1 font-display text-xl text-humo italic">{subtitulo}</p>

            <div className="mt-6 grid grid-cols-2 gap-2.5">
              {ficha.map(([k, v]) => (
                <div key={k} className="rounded-xl border border-linea px-4 py-3">
                  <p className="etiqueta text-[0.6rem]">{k}</p>
                  <p className="mt-0.5">{v}</p>
                </div>
              ))}
            </div>

            <textarea
              className="mt-6 min-h-28 w-full resize-y rounded-xl border border-dashed border-linea bg-transparent p-3 leading-relaxed text-tinta-2 placeholder:text-humo/70 hover:border-oro/50 focus:border-oro focus:outline-none print:resize-none print:border-0 print:p-0"
              placeholder="Escribe aquí una nota para tu cliente: la historia de la pieza, el origen de la piedra, los tiempos de entrega…"
              value={pieza.descripcion}
              onChange={(ev) => actualizar({ descripcion: ev.target.value })}
              onBlur={persistir}
              aria-label="Descripción para el cliente"
            />

            {cot && r && (
              <div className="mt-6 rounded-2xl bg-noche p-6 text-white print:border print:border-linea print:bg-white print:text-tinta">
                <p className="etiqueta text-oro-claro print:text-oro-oscuro">Inversión</p>
                <p className="cifra mt-1 text-4xl">{formatoMoneda(r.impuesto > 0 ? r.total : r.precio, moneda)}</p>
                <p className="mt-1 text-sm text-white/65 print:text-humo">Precio en {moneda} · {r.impuesto > 0 ? `IVA (${cot.datos.impuestoPct}%) incluido` : "impuestos no incluidos"}</p>
                {desglose && (
                  <dl className="mt-4 space-y-1.5 border-t border-white/15 pt-4 text-sm print:border-linea">
                    {partidas.map(([k, v]) => (
                      <div key={k as string} className="flex justify-between">
                        <dt className="text-white/70 print:text-humo">{k}</dt>
                        <dd className="tabular-nums">{formatoMoneda(v as number, moneda)}</dd>
                      </div>
                    ))}
                    {r.impuesto > 0 && (
                      <div className="flex justify-between">
                        <dt className="text-white/70 print:text-humo">IVA</dt>
                        <dd className="tabular-nums">{formatoMoneda(r.impuesto, moneda)}</dd>
                      </div>
                    )}
                  </dl>
                )}
              </div>
            )}
          </div>
        </div>

        <footer className="mt-12 flex flex-wrap justify-between gap-2 border-t border-linea pt-5 text-xs text-humo">
          <span>Propuesta preparada el {new Date(pieza.actualizada).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}</span>
          <span>Precio sujeto al valor del metal el día del pedido.</span>
        </footer>
      </article>
    </div>
  );
}
