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
  // Escrito como el encargo a un fotógrafo de alta joyería: lo que más sube el realismo es
  // pedir construcción real (garras, engastes) y óptica real (lente macro, apilado de foco).
  return [
    "Transform the attached hand sketch into a single photorealistic studio photograph of the finished, handcrafted piece,",
    "indistinguishable from a real photo in a luxury maison's catalog.",
    "",
    `DESIGN. ${describirPieza(e)}`,
    "Keep the exact silhouette, proportions, viewing angle and composition of the sketch, and the placement of every element.",
    "Do not invent new design elements; only add the real construction a master goldsmith would need to make it:",
    "prongs, bezels, galleries, under-bezels, shanks with consistent thickness, clean solder joins.",
    `The sketch's stroke colors mark materials: ${leyenda}; dark ink strokes are outlines only, never render them as lines.`,
    "",
    "CRAFTSMANSHIP. Mirror-polished metal with crisp, realistic reflections of a softbox studio and true metal color.",
    "Textures (hammered, brushed, engraved, milgrain, filigree) only where the design calls for them, rendered in macro detail.",
    "Gemstones with physically accurate optics: razor-sharp facet edges, brilliance, fire and scintillation in diamonds,",
    "deep saturated color with natural inner life in colored stones. Every stone securely held; pavé as individually set",
    "tiny stones with visible beads or micro-prongs.",
    "",
    "PHOTOGRAPHY. 100 mm macro lens, focus-stacked so the whole piece is tack-sharp, high resolution, true-to-life color.",
    "Seamless white-to-light-grey background, large soft key light with white bounce cards, subtle natural contact shadow.",
    "One piece, centered, filling about 70% of the frame.",
    "",
    "AVOID. CGI or 3D-render look, plastic or cartoon look, blurry or smeared details, floating or unsupported stones,",
    "warped or melted metal, duplicated pieces, hands, models, text, logos, watermarks, props, leftover sketch lines.",
  ].join("\n");
}

export function esEspecValida(x: unknown): x is EspecDiseno {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return ["tipo", "metalId", "piedra", "talla", "estilo", "notas"].every((k) => typeof o[k] === "string");
}
