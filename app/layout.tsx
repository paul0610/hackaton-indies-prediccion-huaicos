import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alerta Temprana de Huaicos",
  description:
    "Predicción y alerta temprana de huaicos por cuenca. hack@latam — Environment & Climate Risk.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
