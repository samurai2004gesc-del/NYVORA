"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "./Logo";

const ENLACES = [
  { href: "/estudio", texto: "Estudio" },
  { href: "/cotizador", texto: "Cotizador" },
  { href: "/coleccion", texto: "Colección" },
  { href: "/#preguntas", texto: "Preguntas" },
];

export function Encabezado() {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  if (ruta.startsWith("/propuesta")) return null;

  return (
    <header className="no-imprimir sticky top-0 z-40 border-b border-linea/80 bg-marfil/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="NYVORA, inicio" onClick={() => setAbierto(false)}>
          <Logo />
        </Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Principal">
          {ENLACES.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className={`text-sm transition-colors hover:text-oro-oscuro ${ruta === e.href ? "font-semibold text-tinta" : "text-tinta-2"}`}
            >
              {e.texto}
            </Link>
          ))}
          <Link href="/estudio" className="btn btn-primario btn-chico">
            Abrir estudio
          </Link>
        </nav>
        <button
          type="button"
          className="rounded-full p-2 text-tinta md:hidden"
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={abierto}
          onClick={() => setAbierto(!abierto)}
        >
          {abierto ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {abierto && (
        <nav className="border-t border-linea bg-marfil px-4 pb-4 md:hidden" aria-label="Principal móvil">
          {ENLACES.map((e) => (
            <Link key={e.href} href={e.href} onClick={() => setAbierto(false)} className="block border-b border-linea/70 py-3 text-tinta-2">
              {e.texto}
            </Link>
          ))}
          <Link href="/estudio" onClick={() => setAbierto(false)} className="btn btn-primario mt-4 w-full">
            Abrir estudio
          </Link>
        </nav>
      )}
    </header>
  );
}
