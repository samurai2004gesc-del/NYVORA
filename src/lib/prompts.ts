// Instrucciones que recibe el modelo de imagen. Van en inglés porque los
// modelos de imagen siguen mejor las indicaciones técnicas en ese idioma.

import { COLORES_LAPIZ, ESTILOS, PIEDRAS, TALLAS, TIPOS_PIEZA, metalPorId } from "./materiales.ts";

export interface EspecDiseno {
  tipo: string;
  metalId: string;
  piedra: string;
  talla: string;
  estilo: string;
  notas: string;
}

export type ModoRender = "render" | "tecnico";

export const ESPEC_INICIAL: EspecDiseno = {
  tipo: "solitario",
  metalId: "au18y",
  piedra: "diamante",
  talla: "redonda",
  estilo: "clasico",
  notas: "",
};

const buscar = (lista: { id: string; prompt: string }[], id: string) => lista.find((x) => x.id === id)?.prompt ?? "";

export function describirPieza(e: EspecDiseno): string {
  const piedra = buscar(PIEDRAS, e.piedra);
  const partes = [
    `Piece: ${buscar(TIPOS_PIEZA, e.tipo) || "fine jewelry piece"}.`,
    `Metal: ${metalPorId(e.metalId).prompt}.`,
    piedra ? `Main stone: ${piedra}, ${buscar(TALLAS, e.talla) || "round"} cut.` : "No gemstones.",
    `Style: ${buscar(ESTILOS, e.estilo) || "classic"}.`,
  ];
  const notas = e.notas.trim();
  if (notas) partes.push(`Designer notes (may be in Spanish): ${notas}`);
  return partes.join(" ");
}

export function construirPrompt(modo: ModoRender, e: EspecDiseno): string {
  if (modo === "tecnico") {
    return [
      "Convert this jewelry design into a clean technical drawing sheet for a bench jeweler and CAD modeler.",
      describirPieza(e),
      "Keep the design identical: same silhouette, proportions, stone layout and details.",
      "Show three orthographic views on one sheet (front, side and top), aligned like an engineering drawing.",
      "Precise black ink linework on pure white, consistent line weights, stone outlines with facet lines,",
      "prongs and settings clearly drawn, hidden edges as thin dashed lines.",
      "No shading, no color, no text, no numbers, no logos, no watermark.",
    ].join(" ");
  }
  const leyenda = COLORES_LAPIZ.filter((c) => c.id !== "tinta")
    .map((c) => `${c.nombre.split(" /")[0].toLowerCase()} strokes (${c.hex}) = ${c.prompt}`)
    .join("; ");
  return [
    "Turn this hand-drawn jewelry sketch into a photorealistic, high-end studio product photograph of the finished piece.",
    describirPieza(e),
    "Follow the sketch closely: keep the same silhouette, proportions, viewing angle and the placement of every element.",
    "Interpret rough lines as precise, manufacturable goldsmith work.",
    `Stroke colors indicate materials: ${leyenda}; dark ink strokes are outlines only.`,
    "Photography: a single piece centered, seamless very light grey background, soft diffused light,",
    "realistic metal reflections, crisp gemstone facets with natural fire, macro lens, gentle shadow.",
    "No hands, no text, no watermark, no props.",
  ].join(" ");
}

export function esEspecValida(x: unknown): x is EspecDiseno {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return ["tipo", "metalId", "piedra", "talla", "estilo", "notas"].every((k) => typeof o[k] === "string");
}
