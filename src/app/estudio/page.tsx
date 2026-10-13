"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calculator, Download, Gem, KeyRound, Loader2, PencilRuler, Save, Sparkles } from "lucide-react";
import { Boceto, type ManejadorBoceto } from "@/components/Boceto";
import { MarcaNyvora } from "@/components/Logo";
import { ESTILOS, METALES, PIEDRAS, TALLAS, TIPOS_PIEZA, nombrePorId, metalPorId } from "@/lib/materiales";
import { ESPEC_INICIAL, type EspecDiseno, type ModoRender } from "@/lib/prompts";
import { CLAVE_BOCETO_PORTADA, comprimirImagen, descargar, guardarPieza, nuevaPieza, obtenerPieza } from "@/lib/coleccion";

interface Resultado {
  id: string;
  boceto: string;
  render?: string;
  tecnico?: string;
  espec: EspecDiseno;
  piezaId?: string;
  /** Modelo y resolución que hicieron el render, p. ej. «Nano Banana Pro · 2048 px». */
  motor?: string;
}

type Proveedor = "openai" | "gemini";
type Calidad = "maxima" | "estandar";

interface EstadoIA {
  proveedor: Proveedor | null;
  proveedores: Proveedor[];
  requiereCodigo: boolean;
}

const MOTORES: { id: Proveedor; nombre: string }[] = [
  { id: "gemini", nombre: "Google Nano Banana Pro" },
  { id: "openai", nombre: "OpenAI GPT Image 2" },
];
const CALIDADES: { id: Calidad; nombre: string }[] = [
  { id: "maxima", nombre: "Máxima · 2K (más lento)" },
  { id: "estandar", nombre: "Rápida · 1K" },
];
const NOMBRES_MODELO: Record<string, string> = {
  "gemini-3-pro-image": "Nano Banana Pro",
  "gemini-3.1-flash-image": "Nano Banana 2",
  "gemini-2.5-flash-image": "Nano Banana",
  "gpt-image-2": "GPT Image 2",
  "gpt-image-1.5": "GPT Image 1.5",
  "gpt-image-1": "GPT Image 1",
};

const MENSAJES = ["Puliendo el metal…", "Engastando las piedras…", "Ajustando la luz de estudio…", "Tallando las facetas…", "Últimos destellos…"];
const CLAVE_CODIGO = "nyvora:codigo";

function Selector({ etiqueta, valor, opciones, onChange }: { etiqueta: string; valor: string; opciones: { id: string; nombre: string }[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="etiqueta">{etiqueta}</span>
      <select className="campo mt-1.5" value={valor} onChange={(e) => onChange(e.target.value)}>
        {opciones.map((o) => (
          <option key={o.id} value={o.id}>
            {o.nombre}
          </option>
        ))}
      </select>
    </label>
  );
}

const nombrePieza = (e: EspecDiseno) => `${nombrePorId(TIPOS_PIEZA, e.tipo)} en ${metalPorId(e.metalId).nombre.toLowerCase()}`;

export default function Estudio() {
  const router = useRouter();
  const boceto = useRef<ManejadorBoceto>(null);
  const [vacio, setVacio] = useState(true);
  const [espec, setEspec] = useState<EspecDiseno>(ESPEC_INICIAL);
  const [estadoIA, setEstadoIA] = useState<EstadoIA | null>(null);
  const [motor, setMotor] = useState<Proveedor | null>(null);
  const [calidad, setCalidad] = useState<Calidad>("maxima");
  const [codigo, setCodigo] = useState("");
  const [generando, setGenerando] = useState<ModoRender | null>(null);
  const [segundos, setSegundos] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [activo, setActivo] = useState(0);
  const [vista, setVista] = useState<"render" | "tecnico" | "boceto">("render");
  const [aviso, setAviso] = useState<{ texto: string; enlace?: string } | null>(null);

  const alCambiar = useCallback((v: boolean) => setVacio(v), []);
  const actual = resultados[activo];

  useEffect(() => {
    fetch("/api/render")
      .then((r) => r.json())
      .then((e: EstadoIA) => {
        setEstadoIA({ ...e, proveedores: e.proveedores ?? [] });
        setMotor(e.proveedor);
      })
      .catch(() => setEstadoIA({ proveedor: null, proveedores: [], requiereCodigo: false }));
    try {
      setCodigo(localStorage.getItem(CLAVE_CODIGO) ?? "");
      const dePortada = sessionStorage.getItem(CLAVE_BOCETO_PORTADA);
      if (dePortada) {
        boceto.current?.cargar(dePortada);
        sessionStorage.removeItem(CLAVE_BOCETO_PORTADA);
      }
    } catch {
      // Almacenamiento bloqueado: el estudio funciona igual, sin recordar nada.
    }
  }, []);

  useEffect(() => {
    if (!generando) return;
    setSegundos(0);
    const t = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [generando]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(t);
  }, [aviso]);

  const cambiar = <K extends keyof EspecDiseno>(k: K, v: EspecDiseno[K]) => setEspec((e) => ({ ...e, [k]: v }));

  async function llamarIA(modo: ModoRender, imagen: string, e: EspecDiseno): Promise<{ imagen: string; motor: string } | null> {
    setError(null);
    setGenerando(modo);
    try {
      const r = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-nyvora-code": codigo },
        body: JSON.stringify({ imagen, modo, espec: e, proveedor: motor, calidad }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        if (j.code === "acceso") setEstadoIA((s) => (s ? { ...s, requiereCodigo: true } : s));
        if (j.code === "demo") setEstadoIA((s) => (s ? { ...s, proveedor: null } : s));
        setError(j.error ?? `Error ${r.status}`);
        return null;
      }
      const nombre = NOMBRES_MODELO[j.modelo] ?? j.modelo ?? "";
      return { imagen: j.imagen as string, motor: j.lado ? `${nombre} · ${j.lado} px` : nombre };
    } catch {
      setError("No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.");
      return null;
    } finally {
      setGenerando(null);
    }
  }

  async function generar() {
    const imagen = boceto.current?.exportar();
    if (!imagen) {
      setError("Dibuja tu pieza o sube la foto de un boceto primero.");
      return;
    }
    const salida = await llamarIA("render", imagen, espec);
    if (!salida) return;
    const nuevo: Resultado = { id: crypto.randomUUID(), boceto: imagen, render: salida.imagen, motor: salida.motor, espec };
    setResultados((rs) => [nuevo, ...rs]);
    setActivo(0);
    setVista("render");
  }

  async function planoTecnico() {
    if (!actual?.render) return;
    // Gemini devuelve PNG pesados; en JPEG viajan holgados dentro del límite de Vercel.
    const salida = await llamarIA("tecnico", await comprimirImagen(actual.render, 1024, 0.9), actual.espec);
    if (!salida) return;
    const id = actual.id;
    setResultados((rs) => rs.map((r) => (r.id === id ? { ...r, tecnico: salida.imagen } : r)));
    setVista("tecnico");
  }

  /** Guarda el resultado activo (o solo el boceto) en la colección y devuelve el id de la pieza. */
  async function guardar(): Promise<string | null> {
    try {
      if (!actual) {
        const imagen = boceto.current?.exportar();
        if (!imagen) {
          setError("No hay nada que guardar todavía.");
          return null;
        }
        const pieza = nuevaPieza(espec, nombrePieza(espec));
        pieza.boceto = await comprimirImagen(imagen, 768);
        await guardarPieza(pieza);
        setAviso({ texto: "Boceto guardado en tu colección.", enlace: `/propuesta/${pieza.id}` });
        return pieza.id;
      }
      const existente = actual.piezaId ? await obtenerPieza(actual.piezaId) : undefined;
      const pieza = existente ?? nuevaPieza(actual.espec, nombrePieza(actual.espec));
      pieza.boceto = await comprimirImagen(actual.boceto, 768);
      if (actual.render) pieza.render = await comprimirImagen(actual.render, 2048, 0.9);
      if (actual.tecnico) pieza.tecnico = await comprimirImagen(actual.tecnico, 1600, 0.9);
      await guardarPieza(pieza);
      setResultados((rs) => rs.map((r) => (r.id === actual.id ? { ...r, piezaId: pieza.id } : r)));
      setAviso({ texto: existente ? "Pieza actualizada en tu colección." : "Pieza guardada en tu colección.", enlace: `/propuesta/${pieza.id}` });
      return pieza.id;
    } catch {
      setError("No se pudo guardar. Puede que tu navegador esté en modo privado o sin espacio.");
      return null;
    }
  }

  async function cotizar() {
    const id = await guardar();
    if (id) router.push(`/cotizador?pieza=${id}`);
  }

  const imagenVista = actual ? (vista === "tecnico" ? actual.tecnico : vista === "boceto" ? actual.boceto : actual.render) : undefined;
  const sinIA = estadoIA !== null && estadoIA.proveedor === null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="etiqueta text-oro-oscuro">Estudio de diseño</p>
          <h1 className="titulo-display mt-2 text-4xl sm:text-5xl">Dibuja. Visualiza. Ajusta.</h1>
        </div>
        {estadoIA && (
          <span className={`rounded-full border px-3 py-1 text-xs ${sinIA ? "border-amber-300 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {sinIA ? "Modo demostración" : `IA activa · ${estadoIA.proveedores.length > 1 ? "2 motores" : MOTORES.find((m) => m.id === estadoIA.proveedor)?.nombre}`}
          </span>
        )}
      </div>

      {sinIA && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-sm leading-relaxed text-amber-900">
          <p className="font-semibold">Falta conectar la IA de imágenes.</p>
          <p className="mt-1">
            En Vercel abre tu proyecto → <strong>Settings → Environment Variables</strong>, agrega <code className="rounded bg-white/70 px-1">OPENAI_API_KEY</code>{" "}
            o <code className="rounded bg-white/70 px-1">GEMINI_API_KEY</code> y vuelve a desplegar. Mientras tanto puedes dibujar, guardar bocetos y usar el
            cotizador.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="tarjeta h-fit p-4 sm:p-5">
          <Boceto ref={boceto} onCambio={alCambiar} permitirSubir />
          <p className="mt-3 text-center text-xs text-humo">Cada color es un material. Usa la tinta para contornos. Puedes subir la foto de un boceto en papel.</p>
        </div>

        <div className="space-y-6">
          <div className="tarjeta p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Selector etiqueta="Pieza" valor={espec.tipo} opciones={TIPOS_PIEZA} onChange={(v) => cambiar("tipo", v)} />
              <Selector etiqueta="Metal" valor={espec.metalId} opciones={METALES} onChange={(v) => cambiar("metalId", v)} />
              <Selector etiqueta="Piedra principal" valor={espec.piedra} opciones={PIEDRAS} onChange={(v) => cambiar("piedra", v)} />
              <Selector etiqueta="Talla" valor={espec.talla} opciones={TALLAS} onChange={(v) => cambiar("talla", v)} />
              <Selector etiqueta="Estilo" valor={espec.estilo} opciones={ESTILOS} onChange={(v) => cambiar("estilo", v)} />
              {!sinIA && <Selector etiqueta="Calidad del render" valor={calidad} opciones={CALIDADES} onChange={(v) => setCalidad(v as Calidad)} />}
              {estadoIA && estadoIA.proveedores.length > 1 && motor && (
                <Selector etiqueta="Motor de IA" valor={motor} opciones={MOTORES} onChange={(v) => setMotor(v as Proveedor)} />
              )}
              {estadoIA?.requiereCodigo && (
                <label className="block">
                  <span className="etiqueta flex items-center gap-1">
                    <KeyRound size={12} /> Código de acceso
                  </span>
                  <input
                    className="campo mt-1.5"
                    type="password"
                    value={codigo}
                    autoComplete="off"
                    onChange={(e) => {
                      setCodigo(e.target.value);
                      try {
                        localStorage.setItem(CLAVE_CODIGO, e.target.value);
                      } catch {}
                    }}
                  />
                </label>
              )}
            </div>
            <label className="mt-4 block">
              <span className="etiqueta">Notas para la IA</span>
              <textarea
                className="campo mt-1.5 min-h-20 resize-y"
                maxLength={600}
                placeholder="Ej.: halo de pavé, galería calada, garras en forma de pétalo, acabado martillado…"
                value={espec.notas}
                onChange={(e) => cambiar("notas", e.target.value)}
              />
            </label>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" className="btn btn-primario flex-1" onClick={generar} disabled={!!generando || vacio || sinIA}>
                {generando === "render" ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} className="text-oro-claro" />}
                {resultados.length ? "Generar otra versión" : "Generar render"}
              </button>
              {!actual && (
                <button type="button" className="btn btn-secundario" onClick={guardar} disabled={vacio}>
                  <Save size={16} /> Guardar boceto
                </button>
              )}
            </div>
            {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{error}</p>}
          </div>

          <div className="tarjeta overflow-hidden">
            <div className="relative aspect-square bg-marfil">
              {imagenVista ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagenVista} alt={`${vista === "tecnico" ? "Plano técnico" : vista === "boceto" ? "Boceto" : "Render"} de ${nombrePieza(actual!.espec)}`} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-humo">
                  <MarcaNyvora className="h-12 w-12 opacity-70" />
                  <p className="font-display text-xl text-tinta-2">{actual && vista === "tecnico" ? "Aún no hay plano técnico" : "Tu render aparecerá aquí"}</p>
                  <p className="max-w-xs text-sm">
                    {actual && vista === "tecnico" ? "Pulsa «Plano técnico» para generarlo a partir del render." : "Dibuja, elige los materiales y pulsa «Generar render»."}
                  </p>
                </div>
              )}
              {imagenVista && vista === "render" && actual?.motor && (
                <span className="absolute right-3 bottom-3 rounded-full bg-white/85 px-2.5 py-1 text-[0.7rem] text-tinta-2 backdrop-blur">{actual.motor}</span>
              )}
              {generando && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-marfil/85 backdrop-blur-sm" aria-live="polite">
                  <Gem size={34} className="animate-brillo text-oro" />
                  <p className="font-display text-xl">{MENSAJES[Math.floor(segundos / 4) % MENSAJES.length]}</p>
                  <p className="text-xs text-humo tabular-nums">{segundos} s · {calidad === "maxima" ? "a 2K suele tardar entre 30 y 90 s" : "suele tardar entre 15 y 40 s"}</p>
                </div>
              )}
            </div>

            {actual && (
              <div className="space-y-4 border-t border-linea p-4 sm:p-5">
                <div className="flex gap-1 rounded-full bg-marfil p-1 text-sm" role="tablist" aria-label="Vista">
                  {(["render", "tecnico", "boceto"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      role="tab"
                      aria-selected={vista === v}
                      onClick={() => setVista(v)}
                      className={`flex-1 rounded-full px-3 py-1.5 transition-colors ${vista === v ? "bg-papel font-semibold shadow-sm" : "text-humo hover:text-tinta"}`}
                    >
                      {v === "render" ? "Render" : v === "tecnico" ? "Plano técnico" : "Boceto"}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn btn-secundario btn-chico" onClick={planoTecnico} disabled={!!generando || !actual.render}>
                    <PencilRuler size={15} /> {actual.tecnico ? "Rehacer plano" : "Plano técnico"}
                  </button>
                  <button type="button" className="btn btn-secundario btn-chico" onClick={guardar} disabled={!!generando}>
                    <Save size={15} /> {actual.piezaId ? "Actualizar" : "Guardar"}
                  </button>
                  <button type="button" className="btn btn-secundario btn-chico" onClick={cotizar} disabled={!!generando}>
                    <Calculator size={15} /> Cotizar
                  </button>
                  {imagenVista && (
                    <button type="button" className="btn btn-secundario btn-chico" onClick={() => descargar(imagenVista, `nyvora-${vista}.${imagenVista.startsWith("data:image/png") ? "png" : "jpg"}`)}>
                      <Download size={15} /> Descargar
                    </button>
                  )}
                </div>
                {resultados.length > 1 && (
                  <div>
                    <p className="etiqueta mb-2">Versiones de esta sesión</p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {resultados.map((r, i) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setActivo(i);
                            setVista("render");
                          }}
                          className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === activo ? "border-oro" : "border-transparent opacity-70 hover:opacity-100"}`}
                          aria-label={`Versión ${resultados.length - i}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.render ?? r.boceto} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {aviso && (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center justify-between gap-4 rounded-2xl bg-noche px-5 py-3.5 text-sm text-white shadow-joya sm:inset-x-auto sm:right-6" role="status">
          <span>{aviso.texto}</span>
          {aviso.enlace && (
            <Link href={aviso.enlace} className="font-semibold whitespace-nowrap text-oro-claro hover:underline">
              Ver propuesta
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
