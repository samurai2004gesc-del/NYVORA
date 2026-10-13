"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type PointerEvent, type Ref } from "react";
import { ImagePlus, RefreshCw, Trash2, Undo2 } from "lucide-react";
import { COLORES_LAPIZ } from "@/lib/materiales";

const LADO = 1024;
const SUGERENCIAS = [
  "un solitario",
  "unos aretes de gota",
  "un anillo de serpiente",
  "un broche de libélula",
  "una argolla con pavé",
  "un colgante art déco",
];

type Punto = [number, number];
interface Trazo {
  color: string;
  ancho: number;
  puntos: Punto[];
}

export interface ManejadorBoceto {
  /** Devuelve el boceto como data URL, o null si el lienzo está vacío. */
  exportar(): string | null;
  /** Pone una imagen (foto de un boceto en papel, por ejemplo) como fondo del lienzo. */
  cargar(dataUrl: string): void;
}

function dibujarTrazo(ctx: CanvasRenderingContext2D, t: Trazo) {
  ctx.strokeStyle = t.color;
  ctx.fillStyle = t.color;
  ctx.lineWidth = t.ancho;
  const [p0] = t.puntos;
  if (t.puntos.length === 1) {
    ctx.beginPath();
    ctx.arc(p0[0], p0[1], t.ancho / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  // Curvas por los puntos medios para que el trazo quede suave.
  ctx.beginPath();
  ctx.moveTo(p0[0], p0[1]);
  for (let i = 1; i < t.puntos.length - 1; i++) {
    const [x, y] = t.puntos[i];
    const [nx, ny] = t.puntos[i + 1];
    ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  const ultimo = t.puntos[t.puntos.length - 1];
  ctx.lineTo(ultimo[0], ultimo[1]);
  ctx.stroke();
}

export function Boceto({
  ref,
  permitirSubir = false,
  onCambio,
}: {
  ref?: Ref<ManejadorBoceto>;
  permitirSubir?: boolean;
  onCambio?: (vacio: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const actual = useRef<Trazo | null>(null);
  const [trazos, setTrazos] = useState<Trazo[]>([]);
  const [fondo, setFondo] = useState<HTMLImageElement | null>(null);
  const [color, setColor] = useState(COLORES_LAPIZ[0].hex);
  const [grosor, setGrosor] = useState(4);
  const [sugerencia, setSugerencia] = useState(0);
  const vacio = trazos.length === 0 && !fondo;

  const redibujar = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, LADO, LADO);
    if (fondo) {
      const escala = Math.min(LADO / fondo.width, LADO / fondo.height);
      const w = fondo.width * escala;
      const h = fondo.height * escala;
      ctx.drawImage(fondo, (LADO - w) / 2, (LADO - h) / 2, w, h);
    }
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const t of trazos) dibujarTrazo(ctx, t);
  }, [trazos, fondo]);

  useEffect(() => {
    redibujar();
    onCambio?.(vacio);
  }, [redibujar, onCambio, vacio]);

  useImperativeHandle(
    ref,
    () => ({
      exportar() {
        if (vacio || !canvasRef.current) return null;
        // Con foto de fondo el PNG pesa mucho; el JPEG basta para la IA.
        return fondo ? canvasRef.current.toDataURL("image/jpeg", 0.9) : canvasRef.current.toDataURL("image/png");
      },
      cargar(dataUrl: string) {
        const img = new Image();
        img.onload = () => {
          setFondo(img);
          setTrazos([]);
        };
        img.src = dataUrl;
      },
    }),
    [vacio, fondo],
  );

  const coordenadas = (e: { clientX: number; clientY: number }): Punto => {
    const r = canvasRef.current!.getBoundingClientRect();
    return [((e.clientX - r.left) * LADO) / r.width, ((e.clientY - r.top) * LADO) / r.height];
  };

  const empezar = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const t: Trazo = { color, ancho: grosor * 2.6, puntos: [coordenadas(e)] };
    actual.current = t;
    const ctx = e.currentTarget.getContext("2d")!;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    dibujarTrazo(ctx, t);
  };

  const mover = (e: PointerEvent<HTMLCanvasElement>) => {
    const t = actual.current;
    if (!t) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const eventos = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    for (const ev of eventos.length ? eventos : [e.nativeEvent]) {
      const p = coordenadas(ev);
      const prev = t.puntos[t.puntos.length - 1];
      t.puntos.push(p);
      ctx.strokeStyle = t.color;
      ctx.lineWidth = t.ancho;
      ctx.beginPath();
      ctx.moveTo(prev[0], prev[1]);
      ctx.lineTo(p[0], p[1]);
      ctx.stroke();
    }
  };

  const terminar = () => {
    const t = actual.current;
    actual.current = null;
    if (t) setTrazos((ts) => [...ts, t]);
  };

  const subir = (archivo: File | undefined) => {
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = () => {
      const img = new Image();
      img.onload = () => setFondo(img);
      img.src = String(lector.result);
    };
    lector.readAsDataURL(archivo);
  };

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl border border-linea bg-white">
        <canvas
          ref={canvasRef}
          width={LADO}
          height={LADO}
          className="block aspect-square w-full cursor-crosshair touch-none"
          aria-label="Lienzo para dibujar tu pieza"
          onPointerDown={empezar}
          onPointerMove={mover}
          onPointerUp={terminar}
          onPointerCancel={terminar}
        />
        {vacio && (
          <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
            <p className="pointer-events-auto flex items-center gap-2 font-display text-lg text-humo italic">
              Dibuja <span className="underline decoration-oro/60 underline-offset-4">{SUGERENCIAS[sugerencia]}</span>
              <button
                type="button"
                className="rounded-full p-1 text-oro hover:text-oro-oscuro"
                aria-label="Otra sugerencia"
                onClick={() => setSugerencia((s) => (s + 1) % SUGERENCIAS.length)}
              >
                <RefreshCw size={15} />
              </button>
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2" role="radiogroup" aria-label="Material del trazo">
        {COLORES_LAPIZ.map((c) => (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={color === c.hex}
            title={c.nombre}
            aria-label={c.nombre}
            onClick={() => setColor(c.hex)}
            className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${color === c.hex ? "border-tinta ring-2 ring-oro/40 ring-offset-2" : "border-white shadow"}`}
            style={{ background: c.hex }}
          />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} aria-hidden="true" />
        <input
          type="range"
          min={1}
          max={12}
          value={grosor}
          onChange={(e) => setGrosor(Number(e.target.value))}
          className="w-full accent-[#121829]"
          aria-label="Grosor del trazo"
        />
        <span className="w-5 text-right text-xs text-humo tabular-nums">{grosor}</span>
        <button
          type="button"
          className="rounded-full p-2 text-tinta-2 hover:bg-marfil disabled:opacity-30"
          onClick={() => setTrazos((ts) => ts.slice(0, -1))}
          disabled={trazos.length === 0}
          aria-label="Deshacer"
          title="Deshacer"
        >
          <Undo2 size={17} />
        </button>
        <button
          type="button"
          className="rounded-full p-2 text-tinta-2 hover:bg-marfil disabled:opacity-30"
          onClick={() => {
            setTrazos([]);
            setFondo(null);
          }}
          disabled={vacio}
          aria-label="Borrar todo"
          title="Borrar todo"
        >
          <Trash2 size={17} />
        </button>
        {permitirSubir && (
          <label className="cursor-pointer rounded-full p-2 text-tinta-2 hover:bg-marfil" title="Subir foto de un boceto">
            <ImagePlus size={17} />
            <span className="sr-only">Subir foto de un boceto</span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                subir(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}
