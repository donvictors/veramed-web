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
curl http://localhost:3000/api/health
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
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..." # store público legado, solo para migración/limpieza
PRIVATE_BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..." # store privado de órdenes
AUTH_SECRET="..."
RATE_LIMIT_SECRET="..." # opcional; HMAC para claves de rate limiting
DISCOUNT_CODE_PEPPER="..." # opcional; si falta se usa AUTH_SECRET
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
MEDICAL_PORTAL_MFA_ENCRYPTION_KEY="..." # protege secretos TOTP con AES-256-GCM
MEDICOS_PORTAL_EMAIL="medico@veramed.cl" # bootstrap único del primer administrador
MEDICOS_PORTAL_PASSWORD="..." # mínimo 10 caracteres; rotar después del primer acceso
MEDICAL_SIGNER_NAME="..."
MEDICAL_SIGNER_RUT="..."
MEDICAL_SIGNER_SIS="..."
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
  "orderLink": "https://veramed.cl/chequeo/orden?id=..."
}
```

`requestType` y `requestId` son obligatorios para validar propiedad, estado e idempotencia del envío.
El endpoint no acepta PDFs aportados por el cliente: genera los documentos exclusivamente en el
backend después de comprobar pago y aprobación médica, y envía enlaces temporales revocables.

El backend genera automáticamente los PDFs de la orden y los guarda en un Vercel Blob Store privado:

- `private/ordenes/checkup/<requestId>/...` para chequeo (laboratorio / imágenes / procedimientos según corresponda)
- `private/ordenes/chronic_control/<requestId>/...` para control crónico

La metadata se guarda en Neon mediante Prisma en `OrderPdfAsset`. El navegador y los correos reciben enlaces de Veramed con expiración máxima de siete días; cada acceso queda registrado y puede revocarse.

Para migrar objetos históricos después de conectar el store privado:

```bash
npm run storage:migrate-private -- --dry-run
npm run storage:migrate-private
```

Los descuentos se guardan en `DiscountCode` como HMAC, nunca en texto legible ni en el bundle cliente. Para una importación privada:

```bash
DISCOUNT_CODES_IMPORT_JSON='[...]' npm run db:import-discounts
```

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

Auditoría y revocación de enlaces temporales (requiere `x-support-token`):

- `GET /api/internal/order-pdf-access?requestId=<id>&requestType=checkup|chronic_control|symptoms`
- `DELETE /api/internal/order-pdf-access?requestId=<id>&requestType=checkup|chronic_control|symptoms`

### Sweeper de correos pendientes (producción)

Se agregó un sweeper para recuperar automáticamente solicitudes con:

- `reviewStatus = approved`
- pago confirmado (`payment.status = paid`)
- correo aún no marcado como enviado (`orderEmailSentAt = null`)

Endpoint:

- `GET|POST /api/internal/order-emails/sweep`

Acceso:

- Header `x-support-token: <INTERNAL_SUPPORT_TOKEN>`, o
- Header `Authorization: Bearer <CRON_SECRET>` (o `INTERNAL_CRON_TOKEN`)

Parámetros:

- `limit` (default 20, máx interno 200)
- `dryRun` (true/false)
- `forceResend` (true/false)

Ejemplo manual:

```bash
curl -X POST https://www.veramed.cl/api/internal/order-emails/sweep \
  -H "content-type: application/json" \
  -H "x-support-token: $INTERNAL_SUPPORT_TOKEN" \
  -d '{"limit":25,"dryRun":false,"forceResend":false}'
```

Vercel Cron y outbox:

- La confirmación de pago crea atómicamente un evento outbox idempotente y lo procesa de inmediato.
- `vercel.json` ejecuta un barrido de recuperación diario a las 06:00 UTC, compatible con Hobby.
- Para autorizar el cron en producción, define `CRON_SECRET` en Vercel.

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
  }),
});
```

## Portal médico y controles P1

El portal usa usuarios persistentes en `MedicalPortalUser`, roles `doctor|admin`, sesiones aleatorias
con hash en base de datos, revocación, registro de IP con HMAC y auditoría de vistas/validaciones.
En el primer login, si todavía no existe ningún usuario médico, se importa una sola vez la cuenta
definida por `MEDICOS_PORTAL_EMAIL` y `MEDICOS_PORTAL_PASSWORD` (mínimo 10 caracteres). Después las
credenciales compartidas dejan de intervenir en el login.

Antes del primer despliegue de este flujo, configura ambas variables exclusivamente en producción.
Si faltan, el bootstrap queda cerrado y no se crea una cuenta médica implícita ni de prueba.
Después de crear y comprobar el primer administrador, elimina `MEDICOS_PORTAL_PASSWORD` y
`MEDICOS_PORTAL_EMAIL` de Vercel. La cuenta persiste en la base de datos y ya no depende de esas
variables de bootstrap.

Administración y MFA:

- `GET|POST|PATCH /api/medicos-auth/users` (solo rol `admin`).
- `POST /api/medicos-auth/password` para rotar contraseña y revocar todas las sesiones.
- `POST /api/medicos-auth/mfa` con acciones `start` y `confirm` para activar TOTP.

Los relatos de síntomas solo se envían a OpenAI después de consentimiento explícito. Se limitan
tamaño y frecuencia, y no se incluyen nombre, RUT, correo, teléfono ni dirección.

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

### Administración del blog

Los administradores del portal médico gestionan entradas en `/portal-medicos/blog`.
El editor permite guardar borradores, previsualizar, publicar, editar y retirar artículos.
La URL queda fija después del primer guardado. Los borradores no aparecen en el blog
público ni pueden leerse mediante su URL directa. El contenido admite párrafos,
subtítulos (`##` / `###`), listas (`-`), negritas y enlaces HTTPS; el HTML se muestra como texto.

Antes de desplegar por primera vez esta versión, aplica las migraciones con
`npm run db:deploy`, genera Prisma con `npx prisma generate` e importa los artículos
existentes con `npm run db:import-blog`. Ejecuta los comandos contra la misma base de
datos del despliegue. La importación conserva enlaces y fechas, y puede repetirse sin
sobrescribir cambios editoriales. Reinicia el servidor de desarrollo después de regenerar Prisma.

Pruebas del módulo: `node --test tests/blog-management.test.mjs`.
