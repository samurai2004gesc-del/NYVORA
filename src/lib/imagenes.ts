// Utilidades de servidor para imágenes que llegan como data URL.

export interface ImagenDecodificada {
  mime: string;
  base64: string;
  bytes: number;
}

const DATA_URL = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/;

export function leerDataUrl(valor: unknown): ImagenDecodificada | null {
  if (typeof valor !== "string") return null;
  const m = valor.match(DATA_URL);
  if (!m) return null;
  return { mime: m[1], base64: m[2], bytes: Math.floor((m[2].length * 3) / 4) };
}

export const extension = (mime: string) => (mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png");
