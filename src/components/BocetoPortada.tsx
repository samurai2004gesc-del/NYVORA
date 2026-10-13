"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Boceto, type ManejadorBoceto } from "./Boceto";
import { CLAVE_BOCETO_PORTADA } from "@/lib/coleccion";

/** El lienzo de la portada: dibujas y te lleva al estudio con tu boceto. */
export function BocetoPortada() {
  const boceto = useRef<ManejadorBoceto>(null);
  const router = useRouter();
  const [vacio, setVacio] = useState(true);
  const alCambiar = useCallback((v: boolean) => setVacio(v), []);

  const visualizar = () => {
    const imagen = boceto.current?.exportar();
    if (imagen) {
      try {
        sessionStorage.setItem(CLAVE_BOCETO_PORTADA, imagen);
      } catch {
        // Sin sessionStorage el estudio abre con el lienzo vacío.
      }
    }
    router.push("/estudio");
  };

  return (
    <div className="tarjeta p-4 sm:p-5">
      <Boceto ref={boceto} onCambio={alCambiar} />
      <button type="button" onClick={visualizar} className="btn btn-primario mt-4 w-full py-3.5 text-[0.95rem]">
        <Sparkles size={17} className="text-oro-claro" />
        {vacio ? "Abrir el estudio" : "Visualizar mi pieza"}
      </button>
    </div>
  );
}
