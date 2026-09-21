import type { Metadata } from "next";

export const SITE_URL = "https://www.veramed.cl";
export const SOCIAL_IMAGE_URL = `${SITE_URL}/brand/veramed-landing-image.png`;

type PublicPageMetadataInput = {
  title: string;
  description: string;
  path: `/${string}` | "/";
};

export function createPublicPageMetadata({
  title,
  description,
  path,
}: PublicPageMetadataInput): Metadata {
  const canonical = path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
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
      title,
      description,
      images: [SOCIAL_IMAGE_URL],
    },
  };
}
