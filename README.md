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

## Envío de correos con Resend

Se agregó un endpoint en App Router para envío de correos:

- `POST /api/send-email`

### Variables de entorno requeridas

```bash
RESEND_API_KEY="re_..."
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
AUTH_SECRET="..."
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
```

Para el envío de órdenes se usa:

- `from: "Veramed <ordenes@mail.veramed.cl>"`
- `subject: "Tu orden de exámenes está lista"`

### Payload del endpoint

```json
{
  "requestType": "checkup",
  "requestId": "chk_abc123",
  "email": "paciente@correo.cl",
  "orderLink": "https://veramed.cl/chequeo/orden?id=...",
  "pdfUrl": "https://veramed.cl/api/checkups/chk_123/pdf",
  "pdfBase64": "JVBERi0xLjc...",
  "pdfFilename": "orden-veramed.pdf"
}
```

`pdfUrl` o `pdfBase64` son opcionales. Si se envían, el endpoint intenta adjuntar el PDF.
`requestType` y `requestId` son obligatorios para validar propiedad, estado e idempotencia del envío.

Si no envías `pdfUrl`/`pdfBase64`, el backend genera automáticamente los PDFs de la orden y los guarda en Vercel Blob:

- `ordenes/checkup/<requestId>/...` para chequeo (laboratorio / imágenes / procedimientos según corresponda)
- `ordenes/chronic_control/<requestId>/...` para control crónico

La metadata (URL, categoría, tamaño) se guarda en Neon mediante Prisma en `OrderPdfAsset`.

### Endpoint interno de soporte (PDFs guardados)

Se agregó:

- `GET /api/internal/order-pdfs?requestId=<id>&requestType=checkup|chronic_control`

Parámetros:

- `requestId` obligatorio
- `requestType` opcional (si no se envía, intenta ambos flujos)

Acceso:

- Usuario autenticado dueño de la solicitud, o
- Header `x-support-token` con valor `INTERNAL_SUPPORT_TOKEN` (opcional, para soporte interno).

Endpoints de PDF protegidos disponibles:

- `GET /api/checkups/:id/pdf`
- `GET /api/chronic-controls/:id/pdf`

### Ejemplo de llamada desde frontend

```ts
await fetch("/api/send-email", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    requestType: "checkup",
    requestId: "abc123",
    email: "paciente@correo.cl",
    orderLink: `${window.location.origin}/chequeo/orden?id=abc123`,
    pdfUrl: `${window.location.origin}/api/checkups/abc123/pdf`,
    pdfFilename: "orden-chequeo-abc123.pdf",
  }),
});
```

## Transbank Webpay Plus (API REST)

Se integró Webpay Plus usando `transbank-sdk` con App Router y rutas backend:

- `POST /api/payments/transbank/create`
- `POST /api/payments/transbank/commit`
- `GET|POST /api/payments/transbank/return` (retorno intermedio desde Webpay)
- `GET /payments/transbank/return` (página que confirma y redirige)
- `GET /payment/success`
- `GET /payment/error`

### Variables de entorno requeridas

```bash
APP_URL="http://localhost:3000"
TRANSBANK_ENV="INTEGRACION" # o PRODUCCION

# Solo PRODUCCION:
TRANSBANK_COMMERCE_CODE="5970..."
TRANSBANK_API_KEY_SECRET="..."
```

Reglas de ambiente:

- `INTEGRACION`: usa `Environment.Integration` + credenciales de integración del SDK.
- `PRODUCCION`: usa `Environment.Production` y toma credenciales desde variables de entorno.

### Flujo end-to-end (integración)

1. Crear transacción:

```bash
curl -X POST http://localhost:3000/api/payments/transbank/create \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "orden_001",
    "sessionId": "sesion_001",
    "amount": 1990
  }'
```

Respuesta esperada:

```json
{
  "token": "...",
  "url": "https://webpay3gint.transbank.cl/webpayserver/initTransaction",
  "redirectUrl": "https://webpay3gint.transbank.cl/webpayserver/initTransaction?token_ws=..."
}
```

2. Redirigir al usuario a `redirectUrl`.
3. Webpay vuelve al `return_url` configurado (`/api/payments/transbank/return`), que redirige a `/payments/transbank/return?token_ws=...`.
4. La página `/payments/transbank/return` llama `POST /api/payments/transbank/commit`.
5. Según resultado:
   - Aprobado → `/payment/success?orderId=...`
   - Rechazado/error → `/payment/error?...`

### Persistencia e idempotencia

El estado de pago se guarda en Prisma en el modelo:

- `TransbankPaymentTransaction`

Esto permite:

- idempotencia por `orderId` y `token` (índices únicos)
- reintentos seguros de `commit` y callback repetido
- trazabilidad de respuesta cruda (`transbankResponse`) y códigos de autorización

En `commit`, si falla la confirmación por error transitorio, se intenta conciliación con `Transaction.status(token)` antes de marcar rechazo.

### Nota de producción

Para producción debes usar credenciales reales de Transbank:

- `Tbk-Api-Key-Id` (código de comercio)
- `Tbk-Api-Key-Secret` (llave secreta)

Estas se obtienen tras el proceso de habilitación/validación de Transbank.

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
