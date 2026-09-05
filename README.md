# Mixmag Loyalty Commerce

Demo interactivo de e-commerce con loyalty y marca blanca. Cada cliente puede tener su propio logo, paleta, mensajes y URL, manteniendo el mismo catálogo y flujo de compra.

## Desarrollo local

```bash
npm ci
npm run dev
```

Abre las tiendas incluidas:

- `http://localhost:3000/es/demo/mercado-fresco`
- `http://localhost:3000/es/demo/cirix-market`

Sin variables de Firebase, la tienda usa el catálogo y las marcas incluidas en el repositorio. El carrito queda aislado por marca y, únicamente durante `npm run dev`, el checkout puede crear pedidos temporales en la memoria del proceso para recorrer el demo completo. Todo despliegue requiere Firebase Admin para autenticación y persistencia durable de marcas, logos y pedidos; en producción el checkout se detiene con un mensaje claro si esa persistencia no está configurada.

## Configurar una marca

1. Configura Firebase y un correo operador usando [`.env.example`](./.env.example).
2. Inicia sesión y abre `/admin/settings`.
3. Crea o duplica un perfil, carga el logo y define los cinco colores de marca.
4. Usa la vista previa instantánea y abre la URL generada `/es/demo/{slug}`.

Los perfiles persistentes viven en la colección `brandProfiles`; los logos se guardan en Firebase Storage. Los colores se convierten en tokens semánticos con contraste de texto calculado automáticamente y el editor bloquea combinaciones de fondo incompatibles con WCAG AA.

## Verificación

```bash
npm run lint
npx tsc --noEmit
node scripts/check-contrast.mjs
npm test
npm run build
```

## Deploy on Vercel

The easiest way to deploy the application is to use the [Vercel Platform](https://vercel.com/new).
Configure the environment variables documented in [`.env.example`](./.env.example) before deploying.

## AI support demo

`/ai-support` runs in deterministic simulated mode by default and makes no
OpenAI requests. The active mode is shown prominently in the workspace.

To enable live AI for a presentation, configure these server-side variables in
Vercel and redeploy:

```env
AI_SUPPORT_ENABLED=true
OPENAI_API_KEY=...
AI_SUPPORT_MODEL=gpt-5.6-luna
AI_RATE_LIMIT_SECRET=<at-least-24-random-characters>
```

After the presentation, set `AI_SUPPORT_ENABLED=false` and redeploy. Live mode
uses Firestore documents in `ai_support_rate_limits`; enable a Firestore TTL
policy for their `expiresAt` field so expired counters are removed automatically.
