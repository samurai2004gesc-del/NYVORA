import type { Metadata, Viewport } from "next";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource-variable/manrope";
import "./globals.css";
import { Encabezado } from "@/components/Encabezado";
import { Pie } from "@/components/Pie";

export const metadata: Metadata = {
  title: {
    default: "NYVORA — Del boceto a la joya",
    template: "%s · NYVORA",
  },
  description:
    "Plataforma de IA para joyeros: convierte bocetos en renders fotorrealistas, cotiza al gramo y presenta propuestas de lujo a tus clientes.",
  openGraph: {
    title: "NYVORA — Del boceto a la joya",
    description: "Diseña, cotiza y vende alta joyería con inteligencia artificial.",
    type: "website",
    locale: "es_MX",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf9f5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="flex min-h-dvh flex-col">
        <Encabezado />
        <main className="flex-1">{children}</main>
        <Pie />
      </body>
    </html>
  );
}
