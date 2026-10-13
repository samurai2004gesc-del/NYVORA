"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";

export function Pie() {
  // La propuesta es para el cliente: sin pie de página de la plataforma.
  if (usePathname().startsWith("/propuesta")) return null;
  return (
    <footer className="no-imprimir border-t border-linea bg-papel">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="text-sm text-humo">© {new Date().getFullYear()} NYVORA. Inteligencia para alta joyería.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-tinta-2" aria-label="Pie de página">
          <Link href="/estudio" className="hover:text-oro-oscuro">Estudio</Link>
          <Link href="/cotizador" className="hover:text-oro-oscuro">Cotizador</Link>
          <Link href="/coleccion" className="hover:text-oro-oscuro">Colección</Link>
          <Link href="/#preguntas" className="hover:text-oro-oscuro">Preguntas</Link>
        </nav>
      </div>
    </footer>
  );
}
