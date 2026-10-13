"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calculator, FileText, Plus, Trash2 } from "lucide-react";
import { MarcaNyvora } from "@/components/Logo";
import { borrarPieza, listarPiezas, type Pieza } from "@/lib/coleccion";
import { formatoMoneda } from "@/lib/cotizacion";
import { metalPorId, nombrePorId, TIPOS_PIEZA } from "@/lib/materiales";

export default function Coleccion() {
  const [piezas, setPiezas] = useState<Pieza[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    listarPiezas()
      .then(setPiezas)
      .catch(() => {
        setError(true);
        setPiezas([]);
      });
  }, []);

  async function borrar(p: Pieza) {
    if (!confirm(`¿Borrar «${p.nombre}» de tu colección? No se puede deshacer.`)) return;
    await borrarPieza(p.id);
    setPiezas((ps) => ps?.filter((x) => x.id !== p.id) ?? null);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="etiqueta text-oro-oscuro">Colección</p>
          <h1 className="titulo-display mt-2 text-4xl sm:text-5xl">Tus piezas</h1>
          <p className="mt-2 max-w-xl text-sm text-humo">Se guardan en este navegador. Abre cualquiera para convertirla en una propuesta para tu cliente.</p>
        </div>
        <Link href="/estudio" className="btn btn-primario">
          <Plus size={16} /> Nueva pieza
        </Link>
      </div>

      {error && (
        <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          Tu navegador no permite guardar datos (¿modo privado?). La colección no estará disponible.
        </p>
      )}

      {piezas === null ? (
        <p className="mt-10 text-humo">Cargando…</p>
      ) : piezas.length === 0 ? (
        <div className="tarjeta mt-10 flex flex-col items-center gap-3 px-6 py-16 text-center">
          <MarcaNyvora className="h-12 w-12" />
          <p className="titulo-display text-2xl">Tu colección está vacía</p>
          <p className="max-w-sm text-sm text-humo">Dibuja tu primera pieza en el estudio o guarda una cotización y aparecerá aquí.</p>
          <Link href="/estudio" className="btn btn-primario mt-2">
            Ir al estudio
          </Link>
        </div>
      ) : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {piezas.map((p) => {
            const imagen = p.render ?? p.boceto;
            return (
              <li key={p.id} className="tarjeta group flex flex-col overflow-hidden">
                <Link href={`/propuesta/${p.id}`} className="block aspect-square overflow-hidden bg-marfil">
                  {imagen ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imagen} alt={p.nombre} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <MarcaNyvora className="h-14 w-14 opacity-60" />
                    </div>
                  )}
                </Link>
                <div className="flex flex-1 flex-col p-5">
                  <p className="etiqueta">{nombrePorId(TIPOS_PIEZA, p.espec.tipo)}</p>
                  <Link href={`/propuesta/${p.id}`} className="titulo-display mt-1 text-2xl hover:text-oro-oscuro">
                    {p.nombre}
                  </Link>
                  <p className="text-sm text-humo">{metalPorId(p.cotizacion?.datos.metalId ?? p.espec.metalId).nombre}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="titulo-display text-xl">
                      {p.cotizacion ? formatoMoneda(p.cotizacion.resultado.precio, p.cotizacion.datos.moneda) : <span className="font-sans text-sm text-humo">Sin cotizar</span>}
                    </span>
                    <div className="flex gap-1">
                      <Link href={`/propuesta/${p.id}`} className="rounded-full p-2 text-tinta-2 hover:bg-marfil" aria-label="Ver propuesta" title="Ver propuesta">
                        <FileText size={17} />
                      </Link>
                      <Link href={`/cotizador?pieza=${p.id}`} className="rounded-full p-2 text-tinta-2 hover:bg-marfil" aria-label="Cotizar" title="Cotizar">
                        <Calculator size={17} />
                      </Link>
                      <button type="button" onClick={() => borrar(p)} className="rounded-full p-2 text-tinta-2 hover:bg-red-50 hover:text-red-700" aria-label="Borrar" title="Borrar">
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
