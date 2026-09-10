# Inicio de sesión con Google

El botón usa `signIn("google")` de NextAuth: obtiene CSRF y comienza OAuth mediante POST. Al regresar a `/auth/google/complete`, se sincroniza una sola vez la sesión con la cuenta Veramed. Los errores se muestran en `/ingresar` en español.

Configurar un cliente OAuth de tipo **Aplicación web** en Google Cloud, con el nombre Veramed y los alcances básicos de identidad (openid, email y profile). No requiere habilitar API de datos médicos ni servicios de pago.

URI de redireccionamiento autorizadas:

- `http://localhost:3000/api/auth/callback/google`
- `https://www.veramed.cl/api/auth/callback/google`
- `https://veramed.cl/api/auth/callback/google`

Variables privadas en `.env.local` y en el entorno correspondiente de Vercel:

```dotenv
AUTH_GOOGLE_ID=<ID de cliente OAuth>
AUTH_GOOGLE_SECRET=<secreto de cliente OAuth>
AUTH_SECRET=<secreto de sesión existente; no reemplazar arbitrariamente>
NEXTAUTH_URL=http://localhost:3000
```

En producción, `NEXTAUTH_URL=https://www.veramed.cl`. No copiar el secreto a variables `NEXT_PUBLIC_*` ni al repositorio. Se aceptan también `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` y el secreto de NextAuth `NEXTAUTH_SECRET`.

Tras cambiar variables, reiniciar desarrollo y desplegar producción para aplicarlas. Una aplicación externa en modo de prueba puede restringir quién puede acceder; revisar audiencia y publicación antes de habilitarla para todos los pacientes.

Validación de código: `node --test tests/google-auth.test.mjs`, TypeScript y ESLint. La validación completa requiere credenciales reales y completar el consentimiento de Google.
