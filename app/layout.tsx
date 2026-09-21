import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { SITE_URL, SOCIAL_IMAGE_URL } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Veramed | Tu salud digital, más simple",
  description:
    "Chequeos, control de enfermedades, evaluación de síntomas, renovación de recetas y derivaciones médicas online, con validación médica.",
  openGraph: {
    title: "Veramed | Tu salud digital, más simple",
    description:
      "Chequeos, control de enfermedades, evaluación de síntomas, renovación de recetas y derivaciones médicas online, con validación médica.",
    url: `${SITE_URL}/`,
    siteName: "Veramed",
    locale: "es_CL",
    type: "website",
    images: [
      {
        url: SOCIAL_IMAGE_URL,
        width: 1024,
        height: 1024,
        alt: "Veramed, salud digital más simple",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Veramed | Tu salud digital, más simple",
    description:
      "Chequeos, control de enfermedades, evaluación de síntomas, renovación de recetas y derivaciones médicas online, con validación médica.",
    images: [SOCIAL_IMAGE_URL],
  },
};

const publicStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Veramed",
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/brand/veramed-logo.png`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "Veramed",
      url: `${SITE_URL}/`,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "es-CL",
    },
    ...[
      ["Chequeo preventivo", "/chequeo"],
      ["Control de enfermedades crónicas", "/control-cronico"],
      ["Evaluación de síntomas", "/sintomas"],
      ["Kinesioterapia", "/kinesioterapia"],
      ["Renovación de recetas", "/renovar-receta"],
      ["Control de peso", "/control-peso"],
    ].map(([name, path]) => ({
      "@type": "Service",
      "@id": `${SITE_URL}${path}#service`,
      name,
      serviceType: name,
      url: `${SITE_URL}${path}`,
      provider: { "@id": `${SITE_URL}/#organization` },
      areaServed: { "@type": "Country", name: "Chile" },
    })),
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CL">
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(publicStructuredData).replace(/</g, "\\u003c"),
          }}
        />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
