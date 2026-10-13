// Solitario dibujado en SVG, en dos acabados: boceto a lápiz y render pulido.
// Se usa en la portada para enseñar el paso del boceto a la joya.

const C = { x: 200, y: 258 }; // centro de la argolla
const R_EXT = 112;
const R_INT = 94;

// Brillante visto de frente: tabla, filetín y culata.
const TABLA_Y = 62;
const FILETIN_Y = 86;
const CULATA: [number, number] = [200, 142];
const TABLA_X = [176, 192, 208, 224];
const CORONA_ZIGZAG = [150, 184, 200, 216, 250];
const PABELLON_X = [146, 166, 185, 200, 215, 234, 254];

const corona: [number, number][] = [
  [146, FILETIN_Y],
  [TABLA_X[0], TABLA_Y],
  [TABLA_X[3], TABLA_Y],
  [254, FILETIN_Y],
];

// Triángulos de la corona alternando filetín y tabla.
const zig: [number, number][] = [];
CORONA_ZIGZAG.forEach((gx, i) => {
  zig.push([gx, FILETIN_Y]);
  if (i < TABLA_X.length) zig.push([TABLA_X[i], TABLA_Y]);
});
const triangulosCorona = zig.slice(0, -2).map((p, i) => [p, zig[i + 1], zig[i + 2]]);
const triangulosPabellon = PABELLON_X.slice(0, -1).map((x, i) => [
  [x, FILETIN_Y + 3] as [number, number],
  [PABELLON_X[i + 1], FILETIN_Y + 3] as [number, number],
  CULATA,
]);

const anillo = `M${C.x - R_EXT},${C.y}a${R_EXT},${R_EXT} 0 1,0 ${R_EXT * 2},0a${R_EXT},${R_EXT} 0 1,0 ${-R_EXT * 2},0Z M${C.x - R_INT},${C.y}a${R_INT},${R_INT} 0 1,1 ${R_INT * 2},0a${R_INT},${R_INT} 0 1,1 ${-R_INT * 2},0Z`;

// Garras: dos exteriores que abrazan el filetín y dos interiores más finas.
const garras = [
  "M170,152 C160,132 150,108 147,80",
  "M230,152 C240,132 250,108 253,80",
  "M186,150 C182,130 178,110 176,90",
  "M214,150 C218,130 222,110 224,90",
];
const galeria = "M158,118 Q200,128 242,118";
const hombros = "M118,186 C140,168 158,156 172,150 M282,186 C260,168 242,156 228,150";

const pts = (p: [number, number][]) => p.map((q) => q.join(",")).join(" ");

const sombreado = Array.from({ length: 11 }, (_, i) => {
  const a = ((18 + i * 6) * Math.PI) / 180;
  const x1 = C.x + (R_INT + 3) * Math.cos(a);
  const y1 = C.y + (R_INT + 3) * Math.sin(a);
  const x2 = C.x + (R_EXT - 3) * Math.cos(a + 0.06);
  const y2 = C.y + (R_EXT - 3) * Math.sin(a + 0.06);
  return `M${x1.toFixed(1)},${y1.toFixed(1)}L${x2.toFixed(1)},${y2.toFixed(1)}`;
}).join("");

function Destello({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <path
      d={`M${x},${y - r}Q${x},${y} ${x + r},${y}Q${x},${y} ${x},${y + r}Q${x},${y} ${x - r},${y}Q${x},${y} ${x},${y - r}Z`}
      fill="#fff"
    />
  );
}

export function AnilloIlustracion({ variante, id }: { variante: "boceto" | "render"; id: string }) {
  if (variante === "boceto") {
    const lapiz = "#3F4FC4";
    return (
      <svg viewBox="0 0 400 400" className="h-full w-full" role="img" aria-label="Boceto a lápiz de un anillo solitario">
        <defs>
          <filter id={`${id}-pulso`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" />
            <feDisplacementMap in="SourceGraphic" scale="3.2" />
          </filter>
          <pattern id={`${id}-papel`} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M24 0H0V24" fill="none" stroke="#E9E6F2" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="400" height="400" fill="#FDFCF9" />
        <rect width="400" height="400" fill={`url(#${id}-papel)`} />
        <g stroke={lapiz} fill="none" strokeLinecap="round" opacity="0.35" strokeDasharray="4 5" strokeWidth="0.9">
          <circle cx={C.x} cy={C.y} r={R_EXT + 12} />
          <path d="M200,40V380M120,86H280" />
        </g>
        <g stroke={lapiz} fill="none" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${id}-pulso)`}>
          <circle cx={C.x} cy={C.y} r={R_EXT} strokeWidth="1.8" />
          <circle cx={C.x + 1.5} cy={C.y - 1} r={R_EXT - 1} strokeWidth="0.9" opacity="0.6" />
          <circle cx={C.x} cy={C.y} r={R_INT} strokeWidth="1.6" />
          <path d={sombreado} strokeWidth="1" opacity="0.7" />
          <path d={hombros} strokeWidth="1.4" />
          <path d={garras.join("")} strokeWidth="1.6" />
          <path d={galeria} strokeWidth="1.3" />
          <polygon points={pts(corona)} strokeWidth="1.7" />
          <path d={`M146,${FILETIN_Y}H254M146,${FILETIN_Y + 3}H254`} strokeWidth="1.2" />
          <polyline points={pts(zig)} strokeWidth="1" opacity="0.85" />
          <polygon points={pts([[146, FILETIN_Y + 3], CULATA, [254, FILETIN_Y + 3]])} strokeWidth="1.7" />
          {PABELLON_X.slice(1, -1).map((x) => (
            <path key={x} d={`M${x},${FILETIN_Y + 3}L${CULATA.join(",")}`} strokeWidth="0.9" opacity="0.8" />
          ))}
        </g>
        <text x="300" y="70" fill={lapiz} fontSize="13" fontStyle="italic" fontFamily="Cormorant Garamond, serif" opacity="0.8">
          1.00 ct
        </text>
        <path d="M296,66 C276,64 266,70 258,76" stroke={lapiz} fill="none" strokeWidth="0.9" opacity="0.7" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 400 400" className="h-full w-full" role="img" aria-label="Render de un anillo solitario en oro con diamante">
      <defs>
        <radialGradient id={`${id}-fondo`} cx="50%" cy="38%" r="70%">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E9E7E3" />
        </radialGradient>
        <linearGradient id={`${id}-oro`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F6E2A6" />
          <stop offset="0.22" stopColor="#C89B45" />
          <stop offset="0.45" stopColor="#FBEBB8" />
          <stop offset="0.7" stopColor="#A87C30" />
          <stop offset="1" stopColor="#E7C57A" />
        </linearGradient>
        <linearGradient id={`${id}-garra`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF0C4" />
          <stop offset="1" stopColor="#A98034" />
        </linearGradient>
        <linearGradient id={`${id}-gema`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.5" stopColor="#DCE6F2" />
          <stop offset="1" stopColor="#AFC0D6" />
        </linearGradient>
        <filter id={`${id}-difuso`} x="-20%" y="-200%" width="140%" height="500%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <rect width="400" height="400" fill={`url(#${id}-fondo)`} />
      <ellipse cx={C.x} cy={C.y + R_EXT + 14} rx={R_EXT - 6} ry="9" fill="#2A2418" opacity="0.22" filter={`url(#${id}-difuso)`} />

      <path d={anillo} fill={`url(#${id}-oro)`} fillRule="evenodd" />
      <circle cx={C.x} cy={C.y} r={R_INT} fill="none" stroke="#6E521E" strokeWidth="1.2" opacity="0.6" />
      <circle cx={C.x} cy={C.y} r={R_EXT} fill="none" stroke="#6E521E" strokeWidth="1" opacity="0.45" />
      <path
        d={`M${C.x - R_EXT + 6},${C.y - 8} A${R_EXT - 6},${R_EXT - 6} 0 0,1 ${C.x - 30},${C.y - R_EXT + 10}`}
        stroke="#FFFBEA"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.75"
      />

      <path d={hombros} stroke={`url(#${id}-garra)`} strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d={galeria} stroke={`url(#${id}-garra)`} strokeWidth="5" fill="none" strokeLinecap="round" />

      <polygon points={pts([[146, FILETIN_Y + 3], CULATA, [254, FILETIN_Y + 3]])} fill={`url(#${id}-gema)`} />
      {triangulosPabellon.map((t, i) => (
        <polygon key={`p${i}`} points={pts(t)} fill={["#F4F8FC", "#9FB2CB", "#E2EAF4", "#7D93B2", "#FFFFFF", "#B7C6DA"][i % 6]} opacity="0.9" />
      ))}
      <polygon points={pts(corona)} fill={`url(#${id}-gema)`} />
      {triangulosCorona.map((t, i) => (
        <polygon key={`c${i}`} points={pts(t)} fill={["#FFFFFF", "#C9D6E6", "#EEF3F9", "#A9BBD2"][i % 4]} opacity="0.92" />
      ))}
      <polygon points={pts([[TABLA_X[0], TABLA_Y], [TABLA_X[3], TABLA_Y], [TABLA_X[3] - 4, TABLA_Y + 3], [TABLA_X[0] + 4, TABLA_Y + 3]])} fill="#FFFFFF" />
      <rect x="146" y={FILETIN_Y} width="108" height="3" fill="#D3DCE8" />
      <polygon points={pts([...corona, [254, FILETIN_Y + 3], CULATA, [146, FILETIN_Y + 3]])} fill="none" stroke="#8796AB" strokeWidth="0.8" strokeLinejoin="round" />

      <g stroke={`url(#${id}-garra)`} strokeLinecap="round" fill="none">
        <path d={garras[0] + garras[1]} strokeWidth="7" />
        <path d={garras[2] + garras[3]} strokeWidth="4.5" />
      </g>
      <g stroke="#FFF7DA" strokeLinecap="round" fill="none" opacity="0.8">
        <path d={garras[0] + garras[1]} strokeWidth="1.6" />
      </g>

      <Destello x={186} y={70} r={9} />
      <Destello x={232} y={104} r={6} />
      <Destello x={128} y={210} r={5} />
    </svg>
  );
}
