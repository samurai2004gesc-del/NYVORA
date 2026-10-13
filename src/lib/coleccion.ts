// Colección de piezas guardada en el navegador (IndexedDB).
// Solo se llama desde componentes cliente.

import { createStore, del, entries, get, set, type UseStore } from "idb-keyval";
import type { DatosCotizacion, ResultadoCotizacion } from "./cotizacion.ts";
import type { EspecDiseno } from "./prompts.ts";

export interface Pieza {
  id: string;
  nombre: string;
  descripcion: string;
  creada: number;
  actualizada: number;
  espec: EspecDiseno;
  /** Imágenes como data URL JPEG ya comprimidas. */
  render?: string;
  tecnico?: string;
  boceto?: string;
  cotizacion?: { datos: DatosCotizacion; resultado: ResultadoCotizacion };
}

let almacen: UseStore | null = null;
const tienda = () => (almacen ??= createStore("nyvora", "piezas"));

export async function listarPiezas(): Promise<Pieza[]> {
  const todas = await entries<string, Pieza>(tienda());
  return todas.map(([, p]) => p).sort((a, b) => b.actualizada - a.actualizada);
}

export function obtenerPieza(id: string): Promise<Pieza | undefined> {
  return get<Pieza>(id, tienda());
}

export async function guardarPieza(p: Pieza): Promise<Pieza> {
  const guardada = { ...p, actualizada: Date.now() };
  await set(p.id, guardada, tienda());
  return guardada;
}

export function borrarPieza(id: string): Promise<void> {
  return del(id, tienda());
}

export function nuevaPieza(espec: EspecDiseno, nombre: string): Pieza {
  const ahora = Date.now();
  return { id: crypto.randomUUID(), nombre, descripcion: "", creada: ahora, actualizada: ahora, espec };
}

/** Reescala una imagen y la pasa a JPEG para que ocupe poco al guardarla o enviarla. */
export function comprimirImagen(dataUrl: string, maxLado = 1024, calidad = 0.86): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, maxLado / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas no disponible"));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", calidad));
    };
    img.onerror = () => reject(new Error("No se pudo leer la imagen"));
    img.src = dataUrl;
  });
}

export function descargar(dataUrl: string, nombre: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = nombre;
  a.click();
}

/** El boceto dibujado en la portada viaja al estudio por sessionStorage. */
export const CLAVE_BOCETO_PORTADA = "nyvora:boceto-portada";
