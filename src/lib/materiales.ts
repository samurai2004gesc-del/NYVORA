// Catálogo de materiales que comparten el estudio y el cotizador.

export type BaseMetal = "oro" | "platino" | "plata";

export interface Metal {
  id: string;
  nombre: string;
  base: BaseMetal;
  /** Fracción de metal fino en la aleación (18k = 0.75). */
  pureza: number;
  /** Densidad de la aleación en g/cm³. */
  densidad: number;
  /** Descripción en inglés para el prompt de la IA. */
  prompt: string;
}

export const METALES: Metal[] = [
  { id: "au18y", nombre: "Oro amarillo 18k", base: "oro", pureza: 0.75, densidad: 15.5, prompt: "polished 18k yellow gold" },
  { id: "au18w", nombre: "Oro blanco 18k", base: "oro", pureza: 0.75, densidad: 15.8, prompt: "rhodium-plated 18k white gold" },
  { id: "au18r", nombre: "Oro rosa 18k", base: "oro", pureza: 0.75, densidad: 15.1, prompt: "polished 18k rose gold" },
  { id: "au14y", nombre: "Oro amarillo 14k", base: "oro", pureza: 0.585, densidad: 13.1, prompt: "polished 14k yellow gold" },
  { id: "au14w", nombre: "Oro blanco 14k", base: "oro", pureza: 0.585, densidad: 13.4, prompt: "rhodium-plated 14k white gold" },
  { id: "au10y", nombre: "Oro amarillo 10k", base: "oro", pureza: 0.417, densidad: 11.6, prompt: "polished 10k yellow gold" },
  { id: "au22y", nombre: "Oro 22k", base: "oro", pureza: 0.916, densidad: 17.8, prompt: "rich 22k yellow gold" },
  { id: "pt950", nombre: "Platino 950", base: "platino", pureza: 0.95, densidad: 20.1, prompt: "polished platinum" },
  { id: "ag925", nombre: "Plata 925", base: "plata", pureza: 0.925, densidad: 10.36, prompt: "polished sterling silver" },
];

export function metalPorId(id: string): Metal {
  return METALES.find((m) => m.id === id) ?? METALES[0];
}

/** Precio spot de referencia en USD por gramo de metal fino (13 oct 2026, Kitco/APMEX). */
export const SPOT_USD_GRAMO: Record<BaseMetal, number> = {
  oro: 133.75, // ≈ 4 160 USD/oz troy
  platino: 54.0, // ≈ 1 680 USD/oz troy
  plata: 1.93, // ≈ 60 USD/oz troy
};
export const FECHA_SPOT = "13 oct 2026";

export const TIPOS_PIEZA = [
  { id: "solitario", nombre: "Anillo solitario", prompt: "solitaire engagement ring" },
  { id: "anillo", nombre: "Anillo", prompt: "ring" },
  { id: "argolla", nombre: "Argolla / alianza", prompt: "wedding band" },
  { id: "aretes", nombre: "Aretes", prompt: "pair of earrings" },
  { id: "colgante", nombre: "Colgante / collar", prompt: "pendant necklace" },
  { id: "pulsera", nombre: "Pulsera", prompt: "bracelet" },
  { id: "broche", nombre: "Broche", prompt: "brooch" },
];

export const PIEDRAS = [
  { id: "diamante", nombre: "Diamante", prompt: "diamond" },
  { id: "zafiro", nombre: "Zafiro", prompt: "blue sapphire" },
  { id: "rubi", nombre: "Rubí", prompt: "ruby" },
  { id: "esmeralda", nombre: "Esmeralda", prompt: "emerald" },
  { id: "morganita", nombre: "Morganita", prompt: "peach morganite" },
  { id: "aguamarina", nombre: "Aguamarina", prompt: "aquamarine" },
  { id: "perla", nombre: "Perla", prompt: "lustrous pearl" },
  { id: "ninguna", nombre: "Sin piedra", prompt: "" },
];

export const TALLAS = [
  { id: "redonda", nombre: "Redonda brillante", prompt: "round brilliant" },
  { id: "oval", nombre: "Oval", prompt: "oval" },
  { id: "esmeralda", nombre: "Esmeralda", prompt: "emerald-cut (step cut)" },
  { id: "pera", nombre: "Pera", prompt: "pear" },
  { id: "marquesa", nombre: "Marquesa", prompt: "marquise" },
  { id: "cojin", nombre: "Cojín", prompt: "cushion" },
  { id: "princesa", nombre: "Princesa", prompt: "princess" },
  { id: "trillion", nombre: "Trillion", prompt: "trillion" },
  { id: "cabujon", nombre: "Cabujón", prompt: "smooth cabochon" },
];

export const ESTILOS = [
  { id: "clasico", nombre: "Clásico", prompt: "timeless classic" },
  { id: "minimal", nombre: "Minimalista", prompt: "clean minimalist" },
  { id: "deco", nombre: "Art déco", prompt: "Art Deco geometric" },
  { id: "vintage", nombre: "Vintage", prompt: "vintage Edwardian with milgrain" },
  { id: "organico", nombre: "Orgánico", prompt: "organic, nature-inspired" },
  { id: "escultorico", nombre: "Escultórico", prompt: "bold sculptural haute joaillerie" },
];

/** Colores del lápiz: cada uno le dice a la IA qué material es ese trazo. */
export const COLORES_LAPIZ = [
  { id: "oro", nombre: "Oro", hex: "#C9A13B", prompt: "yellow gold" },
  { id: "blanco", nombre: "Oro blanco / platino", hex: "#A9ADB5", prompt: "white metal (white gold or platinum)" },
  { id: "rosa", nombre: "Oro rosa", hex: "#C2747F", prompt: "rose gold" },
  { id: "zafiro", nombre: "Zafiro", hex: "#2F5BD3", prompt: "blue sapphire" },
  { id: "rubi", nombre: "Rubí", hex: "#C8213A", prompt: "ruby" },
  { id: "esmeralda", nombre: "Esmeralda", hex: "#1E9E5A", prompt: "emerald" },
  { id: "tinta", nombre: "Tinta (contorno)", hex: "#1B1D26", prompt: "outline only" },
];

export function nombrePorId(lista: { id: string; nombre: string }[], id: string): string {
  return lista.find((x) => x.id === id)?.nombre ?? "";
}
