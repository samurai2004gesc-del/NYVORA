// Marca de NYVORA: la tabla de un brillante vista desde arriba.

const punto = (r: number, grados: number) => {
  const a = (grados * Math.PI) / 180;
  return [16 + r * Math.cos(a), 16 + r * Math.sin(a)].map((v) => +v.toFixed(2)) as [number, number];
};
const angulos = Array.from({ length: 8 }, (_, i) => -90 + 22.5 + i * 45);
const exterior = angulos.map((a) => punto(14, a));
const tabla = angulos.map((a) => punto(7, a + 22.5));
const poligono = (pts: [number, number][]) => pts.map((p) => p.join(",")).join(" ");
// Cada vértice de la tabla se une con los dos vértices exteriores vecinos (facetas estrella).
const facetas = tabla.map((t, i) => `M${exterior[i].join(",")}L${t.join(",")}L${exterior[(i + 1) % 8].join(",")}`).join("");

export function MarcaNyvora({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" fill="none">
      <defs>
        <linearGradient id="nyvora-oro" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E3C88E" />
          <stop offset="0.55" stopColor="#B08D4C" />
          <stop offset="1" stopColor="#7E5F27" />
        </linearGradient>
      </defs>
      <polygon points={poligono(exterior)} stroke="url(#nyvora-oro)" strokeWidth="1.4" strokeLinejoin="round" />
      <polygon points={poligono(tabla)} stroke="url(#nyvora-oro)" strokeWidth="1.1" strokeLinejoin="round" />
      <path d={facetas} stroke="url(#nyvora-oro)" strokeWidth="0.8" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <MarcaNyvora />
      <span
        className={`font-display text-[1.35rem] font-semibold tracking-[0.3em] ${claro ? "text-white" : "text-tinta"}`}
      >
        NYVORA
      </span>
    </span>
  );
}
