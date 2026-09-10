import { z } from "zod";

export const BLOG_COVERS = [
  { label: "Chequeo preventivo", value: "/brand/voxel-check_up.png" },
  { label: "Pólipos de colon", value: "/brand/blog-polyps.png" },
  { label: "Colonoscopía", value: "/brand/blog-colon.png" },
  { label: "Decisiones clínicas", value: "/brand/voxel-cascadas_dg.png" },
];

export function blogSlug(title: string) {
  return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120).replace(/-$/, "");
}

export function safeBlogUrl(value: string) {
  if (/^\/(?!\/)[a-zA-Z0-9/_?=#.%&-]*$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}

export const blogPostSchema = z.object({
  slug: z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .refine(value => value !== "que-examenes-de-chequeo-preventivo", "Esta dirección está reservada."),
  title: z.string().trim().min(3).max(180),
  summary: z.string().trim().min(10).max(500),
  category: z.string().trim().min(2).max(80),
  coverImage: z.string().trim().max(1000).refine(safeBlogUrl, "Usa una imagen local o una URL HTTPS."),
  content: z.string().trim().min(20).max(100_000),
  authorName: z.string().trim().min(2).max(160),
  seoTitle: z.string().trim().max(200).default(""),
  seoDescription: z.string().trim().max(500).default(""),
  status: z.enum(["draft", "published"]),
}).strict();

export type BlogPostInput = z.infer<typeof blogPostSchema>;
export type BlogPostDto = BlogPostInput & {
  id: string;
  version: number;
  publishedAt: string | null;
  updatedAt: string;
};

export function blogDate(value: string | Date) {
  return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

export function blogReadTime(content: string) {
  return `${Math.max(1, Math.ceil(content.trim().split(/\s+/).length / 180))} min`;
}
