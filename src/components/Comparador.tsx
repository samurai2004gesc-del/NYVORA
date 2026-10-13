"use client";

import { useState } from "react";
import { AnilloIlustracion } from "./AnilloIlustracion";

/** Deslizador antes/después: boceto a la izquierda, render a la derecha. */
export function Comparador() {
  const [corte, setCorte] = useState(50);
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-[1.5rem] border border-linea shadow-joya">
      <div className="absolute inset-0">
        <AnilloIlustracion variante="boceto" id="cmp-b" />
      </div>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${corte}%)` }}>
        <AnilloIlustracion variante="render" id="cmp-r" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 w-px bg-white shadow-[0_0_0_1px_rgba(20,22,31,0.15)]" style={{ left: `${corte}%` }}>
        <span className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-linea bg-white text-xs text-tinta-2 shadow-joya">
          ⟷
        </span>
      </div>
      <span className="etiqueta absolute top-4 left-4 rounded-full bg-white/85 px-3 py-1">Boceto</span>
      <span className="etiqueta absolute top-4 right-4 rounded-full bg-white/85 px-3 py-1">Render IA</span>
      <input
        type="range"
        min={0}
        max={100}
        value={corte}
        onChange={(e) => setCorte(Number(e.target.value))}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        aria-label="Comparar boceto y render"
      />
    </div>
  );
}
