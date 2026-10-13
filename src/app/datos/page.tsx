"use client";

import { useEffect, useState } from "react";
import { Lock, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { metalPorId, nombrePorId, TIPOS_PIEZA } from "@/lib/materiales";
import type { EspecDiseno } from "@/lib/prompts";

interface Reciente {
  id: string;
  valoracion: "buena" | "mala";
  fecha: string;
  boceto: string;
  render: string;
  espec?: EspecDiseno;
  modelo?: string;
}

interface Resumen {
  buenas: number;
  malas: number;
  meta: number;
  recientes: Reciente[];
}

const CLAVE_ADMIN = "nyvora:admin";

/** Las imágenes del dataset son privadas: se piden con el código y se muestran como blob local. */
function ImagenPrivada({ ruta, codigo, alt }: { ruta: string; codigo: string; alt: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let url: string | null = null;
    let vivo = true;
    fetch(`/api/dataset/archivo?ruta=${encodeURIComponent(ruta)}`, { headers: { "x-nyvora-admin": codigo } })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => {
        if (!b || !vivo) return;
        url = URL.createObjectURL(b);
        setSrc(url);
      })
      .catch(() => {});
    return () => {
      vivo = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [ruta, codigo]);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="h-full w-full object-cover" />
  ) : (
    <div className="h-full w-full animate-pulse bg-linea/50" />
  );
}

export default function Datos() {
  const [codigo, setCodigo] = useState("");
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function cargar(c = codigo) {
    setCargando(true);
    setError(null);
    try {
      const r = await fetch("/api/dataset", { headers: { "x-nyvora-admin": c } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setResumen(null);
        setError(j.error ?? `Error ${r.status}`);
        return;
      }
      setResumen(j);
      try {
        sessionStorage.setItem(CLAVE_ADMIN, c);
      } catch {}
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    try {
      const guardado = sessionStorage.getItem(CLAVE_ADMIN);
      if (guardado) {
        setCodigo(guardado);
        cargar(guardado);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function borrar(m: Reciente) {
    if (!confirm("¿Borrar esta muestra del dataset? No se puede deshacer.")) return;
    const r = await fetch(`/api/dataset?id=${m.id}`, { method: "DELETE", headers: { "x-nyvora-admin": codigo } });
    if (r.ok) cargar();
    else setError("No se pudo borrar la muestra.");
  }

  const progreso = resumen ? Math.min(100, Math.round((resumen.buenas / resumen.meta) * 100)) : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="etiqueta text-oro-oscuro">Motor NYVORA</p>
      <h1 className="titulo-display mt-2 text-4xl sm:text-5xl">Datos de entrenamiento</h1>
      <p className="mt-2 max-w-2xl text-sm text-humo">
        Pares boceto → render que los usuarios valoraron y aceptaron compartir. Con unas {resumen?.meta ?? 500} muestras buenas se puede entrenar la
        primera versión del motor propio.
      </p>

      {!resumen && (
        <form
          className="tarjeta mt-8 flex max-w-md flex-col gap-3 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            cargar();
          }}
        >
          <label className="block">
            <span className="etiqueta flex items-center gap-1">
              <Lock size={12} /> Código de administración
            </span>
            <input className="campo mt-1.5" type="password" value={codigo} onChange={(e) => setCodigo(e.target.value)} autoComplete="off" />
          </label>
          <button type="submit" className="btn btn-primario" disabled={!codigo || cargando}>
            {cargando ? "Entrando…" : "Entrar"}
          </button>
          <p className="text-xs text-humo">Es el valor de la variable NYVORA_ADMIN_CODE en Vercel.</p>
        </form>
      )}

      {error && (
        <p className="mt-6 max-w-2xl rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      )}

      {resumen && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="tarjeta p-5 sm:col-span-2">
              <div className="flex items-end justify-between">
                <p className="etiqueta">Muestras buenas</p>
                <p className="text-sm text-humo">Meta: {resumen.meta}</p>
              </div>
              <p className="cifra mt-1 text-4xl">{resumen.buenas}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-linea" role="progressbar" aria-valuenow={progreso} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-oro" style={{ width: `${progreso}%` }} />
              </div>
              <p className="mt-2 text-xs text-humo">{progreso}% de la meta para entrenar la primera versión.</p>
            </div>
            <div className="tarjeta p-5">
              <p className="etiqueta">Muestras malas</p>
              <p className="cifra mt-1 text-4xl">{resumen.malas}</p>
              <p className="mt-2 text-xs text-humo">No entran al entrenamiento; sirven para comparar motores.</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-linea bg-papel p-5 text-sm leading-relaxed text-tinta-2">
            <p className="font-semibold text-tinta">Para exportar y entrenar</p>
            <p className="mt-1">
              En tu compu, dentro del proyecto: <code className="rounded bg-marfil px-1">npx vercel link</code>,{" "}
              <code className="rounded bg-marfil px-1">npx vercel env pull .env.local</code> y{" "}
              <code className="rounded bg-marfil px-1">npm run dataset:exportar</code>. Sale un zip con los pares en el formato de los entrenadores de
              fal.ai. Los pasos completos están en el README.
            </p>
          </div>

          <h2 className="titulo-display mt-10 text-2xl">Últimas muestras</h2>
          {resumen.recientes.length === 0 ? (
            <p className="mt-3 text-sm text-humo">Todavía no hay muestras. Aparecerán cuando alguien valore un render en el estudio con el permiso marcado.</p>
          ) : (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resumen.recientes.map((m) => (
                <li key={m.id} className="tarjeta overflow-hidden">
                  <div className="grid grid-cols-2 gap-px bg-linea">
                    <div className="aspect-square bg-white">
                      <ImagenPrivada ruta={m.boceto} codigo={codigo} alt="Boceto" />
                    </div>
                    <div className="aspect-square bg-white">
                      <ImagenPrivada ruta={m.render} codigo={codigo} alt="Render" />
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0 text-sm">
                      <p className="flex items-center gap-1.5 font-medium">
                        {m.valoracion === "buena" ? <ThumbsUp size={14} className="text-emerald-700" /> : <ThumbsDown size={14} className="text-red-700" />}
                        {m.espec ? `${nombrePorId(TIPOS_PIEZA, m.espec.tipo)} · ${metalPorId(m.espec.metalId).nombre}` : "Muestra"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-humo">
                        {new Date(m.fecha).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
                        {m.modelo ? ` · ${m.modelo}` : ""}
                      </p>
                    </div>
                    <button type="button" onClick={() => borrar(m)} className="rounded-full p-2 text-humo hover:bg-red-50 hover:text-red-700" aria-label="Borrar muestra">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
