// Códigos de acceso. Se comparan por hash para no filtrar nada por el tiempo de respuesta.

import { createHash, timingSafeEqual } from "node:crypto";

const h = (s: string) => createHash("sha256").update(s).digest();
const igual = (a: string, b: string) => timingSafeEqual(h(a), h(b));

/** Código del estudio (NYVORA_ACCESS_CODE). Si no está configurado, cualquiera puede generar. */
export function codigoValido(req: Request): boolean {
  const esperado = process.env.NYVORA_ACCESS_CODE;
  if (!esperado) return true;
  return igual(req.headers.get("x-nyvora-code") ?? "", esperado);
}

/** Código de administración (NYVORA_ADMIN_CODE). Sin él configurado, nadie entra. */
export function adminValido(req: Request): boolean {
  const esperado = process.env.NYVORA_ADMIN_CODE;
  if (!esperado) return false;
  return igual(req.headers.get("x-nyvora-admin") ?? "", esperado);
}
