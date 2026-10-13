import type { Metadata } from "next";

export const metadata: Metadata = { title: "Datos de entrenamiento", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
