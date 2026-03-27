import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import "./globals.css";

const metadataBaseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),
  title: "Veramed | Órdenes médicas pensadas para ti",
  description:
    "Solicita órdenes médicas de laboratorio con una recomendación clara, preparación sugerida y validación clínica en un flujo simple.",
  openGraph: {
    title: "Veramed | Órdenes médicas pensadas para ti",
    description:
      "Chequeos preventivos y órdenes médicas orientadas por evidencia, con foco en claridad clínica y trazabilidad.",
    locale: "es_CL",
    type: "website",
    images: [
      {
        url: "/brand/veramed-logo.png",
        width: 1200,
        height: 630,
        alt: "Veramed",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CL">
      <body className="antialiased">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
