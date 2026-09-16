# Mixmag Loyalty Commerce

Demo interactivo de e-commerce con loyalty y marca blanca. Cada cliente puede tener su propio logo, paleta, mensajes y URL, manteniendo el mismo catálogo y flujo de compra.

## Acceso a la plataforma

La landing y la solicitud de reseñas `/review` son públicas. Los demás módulos, las demos y las APIs internas requieren una cuenta previamente habilitada. Los endpoints de captación `/api/contact` y eventos anónimos `/api/reviews/events` permanecen públicos con validación propia. Consulta [cómo crear, habilitar y revocar usuarios](docs/platform-access.md).

El [módulo de Google Reviews](modules/reviews/README.md) está disponible en `/es/reviews` y `/en/reviews` para cuentas habilitadas de la plataforma, con campañas, invitaciones y métricas. La entrada pública `/make-a-review` conserva `/review` como alias y permite continuar al formulario oficial de Google sin duplicar campos. Admite `?source=qr`, `whatsapp`, `email` o `sms`.

## Google Search Console y SEO

El portal genera su [sitemap](https://www.cirixadv.com/sitemap.xml) y
[robots.txt](https://www.cirixadv.com/robots.txt) con Next.js. Consulta la
[guía de indexación y mantenimiento](docs/search-console.md) para enviar el sitemap,
solicitar el rastreo de la portada y revisar los metadatos.

## Desarrollo local

```bash
npm ci
npm run dev
```

Abre las tiendas incluidas:

- `http://localhost:3000/es/demo/mercado-fresco`
- `http://localhost:3000/es/demo/cirix-market`

El MVP `/es/loyalty` abre la tienda de supermercado demo. Cada usuario autorizado puede comprar, gestionar pedidos y cambiar la marca tras iniciar sesión, tanto en desarrollo como en un despliegue. El estado se guarda por marca en su navegador y se puede restablecer desde el administrador. Los datos de las marcas incluidas son locales; Firebase es necesario para controlar el acceso. Los pagos y las notificaciones son simulados.

Abre `/es/demo/mercado-fresco/admin` para administrar el demo o `/es/demo/mercado-fresco/admin/settings` para cambiar su apariencia. Consulta el [mapa del módulo, contrato de colores y recorrido de prueba](docs/supermarket-demo.md).

## Configurar una marca

1. Abre `/es/demo/mercado-fresco/admin/settings`, con una cuenta autorizada.
2. Cambia el nombre, carga un logo y elige un preset o ajusta los cinco colores.
3. Revisa la vista previa y pulsa **Guardar apariencia**.
4. Vuelve a la tienda; la nueva identidad se aplica también al carrito, checkout, cuenta y panel.

Estas ediciones pertenecen al navegador: compartir la URL abre la marca base, sin transferirlas. Para gestionar perfiles persistentes compartidos se conserva el panel operativo `/admin/settings`, protegido por Firebase y permisos de operador; sus perfiles viven en `brandProfiles` y sus logos en Firebase Storage. Los colores se convierten en tokens semánticos con contraste calculado automáticamente.

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
