This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Prisma + Neon

La integración usa Prisma con PostgreSQL en Neon.

### Variables de entorno

Define estas variables en `.env.local`:

```bash
DATABASE_URL="postgresql://...pooler.../neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://.../neondb?sslmode=require&channel_binding=require"
```

`DATABASE_URL` se usa por el cliente de aplicación y `DIRECT_URL` por migraciones.

Además, Prisma CLI lee `.env` por defecto. En este repo quedó espejado el mismo contenido en `.env` y `.env.local` para que:
- Next use `.env.local`
- Prisma use `.env`

### Migraciones

```bash
npm run db:migrate
```

Para aplicar migraciones ya existentes:

```bash
npm run db:deploy
```

Para abrir Prisma Studio:

```bash
npm run db:studio
```

### Probar la conexión

Levanta el proyecto y consulta:

```bash
curl http://localhost:3000/api/health/db
```

La respuesta esperada es:

```json
{ "ok": true }
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
