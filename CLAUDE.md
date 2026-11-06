# Cirix Tech Platform

Plataforma interna de Cirix (agencia de marketing, Fort Myers, FL), publicada en `cirixadv.com`. Reúne herramientas para la agencia y sus clientes: CRM sobre Zoho, medición propia (Pixel Hub), campañas de Google Reviews, seguimiento de llamadas, reenvío de correo y, por herencia de otro proyecto, una tienda de lealtad con demos. La landing pública vive en otro repo (`Cirix`, `www.cirixad.com`) y depende de esta API.

> Next.js 16 tiene cambios incompatibles con lo que probablemente conoces. Antes de escribir código de Next, lee la guía relevante en `node_modules/next/dist/docs/` y respeta los avisos de deprecación (ver `AGENTS.md`). Ejemplo: el middleware se llama `proxy.ts`.

## Alcance aprobado (octubre 2026)

El cliente aprobó la "Propuesta Ecosistema Cirix (CX)": tres pilares sobre un CRM central compartido.

1. **Supermercado Loyalty (PWA):** registro con bono, recibos leídos por IA, puntos por monto, campañas dinámicas por calendario, catálogo de premios y canje con código único.
2. **Restaurant Loyalty:** tarjeta de sellos digital/wallet. La visita se sella de dos formas: el personal escanea el QR personal del cliente, o (si el dueño lo activa, por pedido del cliente) el comensal escanea el QR impreso en la mesa.
3. **Automatización omnicanal:** chatbot de texto, voicebot, CRM, landing/SEO y gestor de reputación (Google Reviews).

E-commerce es fase futura (la tienda `loyalty` heredada encaja ahí, con los pagos a rehacer).

Decisiones ya tomadas:

- **Un solo sistema multi-negocio**; cada negocio y cliente ve solo lo suyo.
- **El CRM vive en la plataforma** (`modules/crm`); Zoho es opcional.
- **Sin presupuesto por ahora:** nada que exija plan de pago de Firebase, y los servicios de uso (OpenAI, Twilio, WhatsApp) se difieren. Se construyen versiones sin costo detrás de puertos (`ReceiptReader`, `ChatResponder`…) para enchufar proveedores de pago después sin reescribir.
- **Reseñas:** el enlace de Google se envía a **todos** los clientes, nunca solo a los que califican bien (filtrar reseñas va contra la política de Google). La encuesta sirve además para abrir un ticket privado.

Fases (0 y 1 completadas; las demás pendientes):

| Fase | Contenido | Estado |
|---|---|---|
| 0. Cimientos | `core/tenancy` (negocios, roles), `modules/crm` (clientes y eventos), sesión `member`, registro por QR, `/me`, panel `/biz/[slug]`, script de negocios | **Hecha** |
| 1. Restaurantes | QR personal rotativo y firmado, pantalla de escaneo con confirmación, tarjeta de sellos animada, programa configurable, espera antifraude y registro por empleado; QR de mesa imprimible que registra y, si el dueño lo activa, sella la visita; progreso de sellos en la lista de clientes, reporte de actividad por empleado y por origen, y gestión del personal desde el panel (`docs/stamp-card.md`, `docs/tenancy.md`) | **Hecha** |
| Recibos | Escaneo de recibos con OCR gratuito en el servidor: un sello en restaurantes, puntos según el total en supermercados, con antifraude y tablero del dueño (`docs/receipts.md`) | **Hecha** |
| 2. Supermercado A | Catálogo de premios y canje con código único (`docs/receipts.md`) hechos; falta el bono de bienvenida | En curso |
| 3. Supermercado B | Cola de revisión de recibos, campañas dinámicas | Pendiente |
| 4. CRM y reputación | Seguimiento automático post-compra, encuesta, enlace de Google para todos, tickets | Pendiente |
| 5. Chatbot | Versión por reglas por negocio, widget web, captura de prospectos | Pendiente |
| 6. Voicebot | Requiere presupuesto | Pospuesto |
| 7. E-commerce | Reactivar `loyalty` con pagos de EE. UU. | Pendiente |

## Stack

- Next.js 16.2 (App Router, Turbopack), React 19.2, TypeScript, Tailwind 4
- Firebase: Auth (Google y enlace por correo), Firestore y Admin SDK. Storage solo para logos de marca
- Zod 4 para validación; Vitest 4 para pruebas; ESLint 9
- Servicios externos: Zoho CRM, Resend (correo), Twilio (llamadas), Google Business Profile, OpenAI (vía `ai` / `@ai-sdk`), Three.js (escena 3D del demo n8n)
- Despliegue previsto: Vercel. `vercel.json` define un cron diario (`/api/cron/rewards`, 06:00 UTC)

## Comandos

```bash
npm run dev          # http://localhost:3000, lee .env.local
npm test             # Vitest (test/**/*.test.ts)
npm run lint
npx tsc --noEmit     # requiere haber corrido `next build` o `next typegen` antes (tipo RouteContext)
npm run build        # necesita acceso a Google Fonts
node scripts/check-contrast.mjs
```

Instalación: `npm ci` falla si `package-lock.json` queda desincronizado con `package.json`; en ese caso usar `npm install` y commitear el lockfile.

Prueba de integración contra el Firestore real (omitida por defecto; escribe datos temporales con prefijo `itest-` y los borra):

```bash
FIRESTORE_INTEGRATION=1 npx vitest run test/firestore-tenancy-crm.integration.test.ts test/firestore-stamp-card.integration.test.ts
```

Negocios y personal (escribe en el Firebase de `.env.local`):

```bash
node scripts/manage-business.mjs create --name "Cafe Luna" --slug cafe-luna --kind restaurant --owner dueno@correo.com --confirm
node scripts/manage-business.mjs add-member --slug cafe-luna --email persona@correo.com --role staff --confirm
node scripts/manage-business.mjs list
```

Scripts: `manage-platform-user.mjs` (dar/quitar acceso), `seed-call-tracking.mjs` (datos demo de llamadas, exige modo Trial), `check-contrast.mjs`, `generate-icons.mjs`, `generate-favicon.mjs`, `prune-legacy-departments.mjs`.

## Entorno

Copiar `.env.example` a `.env.local` (ignorado por git). Obligatorias: credenciales Firebase Admin (`FIREBASE_*`) y Web (`NEXT_PUBLIC_FIREBASE_*`), `OPERATOR_EMAILS`, `CRON_SECRET`, `CONTACT_ALLOWED_ORIGINS`, `NEXT_PUBLIC_SITE_URL` y `STAMP_QR_SECRET` (≥32 caracteres; firma el QR de los clientes, ver `docs/stamp-card.md`). Zoho, Resend, Twilio, Google Business y OpenAI son opcionales y se activan por módulo.

- Las variables de servidor y las `NEXT_PUBLIC_*` deben apuntar al **mismo** proyecto Firebase.
- No pegar claves en chats, issues ni commits. Las claves se escriben directamente en `.env.local` o en Vercel.
- Los valores de ejemplo de `.env.example` (proyecto `mixmag-6496a`, teléfonos `+1737…`/`+58…`, `mixmag.vercel.app`) son restos del proyecto anterior; no usarlos.

### Restricción de facturación

El proyecto Firebase de desarrollo (`cirixadv-cae9c`) está **sin plan Blaze**. No se puede usar Storage, ni las políticas TTL de Firestore, ni los índices compuestos de `calls`. No proponer cambios que dependan de facturación sin avisar. Consecuencias:

- `uploadBrandLogo` (logos desde `/admin/settings` de la tienda) no funciona.
- Los datos con `expiresAt` no se borran solos; el código igualmente los ignora cuando vencen.
- Si se activa la facturación: `npx firebase-tools deploy --only firestore:indexes --project <id>`.

## Módulos

| Módulo | Qué hace | Rutas principales | Externos |
|---|---|---|---|
| `core/tenancy` | **Multi-negocio**: negocios (tenants), roles por negocio (dueño, personal) y la puerta de autorización | `/biz/[slug]`, `/biz/[slug]/team`, `/api/member/biz/*` | — |
| `crm` | **Núcleo CRM propio**: clientes por negocio y su línea de tiempo de eventos. Es el sistema de registro; Zoho es opcional | `/b/[slug]`, `/me`, `/api/member/*` | — |
| `stamp-card` | **Tarjeta de sellos** para restaurantes: QR personal rotativo y firmado, escaneo del personal, premio y reinicio | `/me/cards/[slug]`, `/biz/[slug]/scan`, `/biz/[slug]/program`, `/biz/[slug]/qr`, `/biz/[slug]/activity`, `/api/member/*` | — |
| `receipts` | **Escaneo de recibos y puntos de supermercado**: OCR gratuito detrás del puerto `ReceiptReader`, verificación, uso único, catálogo de premios y canje con código | `/me/points/[slug]`, `/biz/[slug]/receipts`, `/biz/[slug]/rewards`, `/biz/[slug]/scan`, `/api/member/businesses/[slug]/{receipts,redemptions}`, `/api/member/biz/[slug]/{receipts,rewards,redemptions}` | — |
| `zoho/crm` | Integración opcional con Zoho: dashboard (leads, prospects, customers, subscribers, KPIs) y captura de leads | `/zoho/*`, `/api/zoho/*`, `/api/contact` | Zoho |
| `pixels` | Pixel Hub: registro de sitios, colector con consentimiento, SDK `public/pixel.js` | `/pixels`, `/api/pixels/*` | — |
| `reviews` | Campañas, invitaciones con token, QR, KPIs y lectura de reseñas de Google | `/reviews`, `/make-a-review`, `/api/reviews/*` | Google Business |
| `calls` | Seguimiento de llamadas por Twilio (webhooks firmados, dashboard) | `/calls`, `/api/calls/*`, `/api/webhooks/twilio/*` | Twilio |
| correo | Reenvío de `@cirixad.com` a Gmail y respuestas desde el alias | `/api/webhooks/resend` | Resend |
| `ai-support` | Chat de soporte; modo simulado por defecto, sin gasto de tokens | `/ai-support`, `/api/ai-support/chat` | OpenAI (opcional) |
| `n8n` | Demo visual de automatizaciones (editor 3D, citas) | `/n8n` | — |
| `loyalty/*` | Tienda con carrito, pedidos, cupones, wallet de recompensas, referidos, antifraude, notificaciones, RFM, demos de marca blanca | `/loyalty`, `/admin/*`, `/demo/[brandSlug]/*`, `/cart`, `/checkout` | Storage (logos) |

`shared/mvp-modules.ts` define las tarjetas de módulos que se muestran en la portada. Documentación por módulo: `docs/` (acceso, correo, Twilio, demo de supermercado, Search Console, login) y `modules/reviews/README.md`, `modules/pixels/README.md`.

> `loyalty` proviene de un proyecto anterior (Mixmag): pagos Pago Móvil/Zelle/transferencia, tasa BCV de Venezuela, zonas de entrega de ejemplo y zona horaria de Caracas. Su pertenencia al alcance de Cirix está pendiente de confirmar con el cliente. No ampliar ese módulo sin decidirlo antes.

## Estructura

```
app/
  [lang]/…          # rutas localizadas (es/en); muchas son `export { default } from "../page"`
  api/…             # handlers de API, webhooks, cron
  admin/, zoho/, …  # rutas sin prefijo: el proxy las redirige a /es o /en
proxy.ts            # frontera de acceso (ver "Acceso")
core/               # iam (identidad/sesiones) y audit; transversales
modules/            # un directorio por módulo (ver tabla)
shared/             # kernel (Result, Entity, ValueObject, UseCase…) y firebase-admin
lib/                # auth, i18n/locale, formato, referidos, correo
components/         # UI compartida (store/, admin/, cart/, zoho/, landing/…)
test/               # pruebas Vitest
scripts/            # utilidades de línea de comandos
```

Alias de importación: `@/*` apunta a la raíz del repo.

## Arquitectura

Hexagonal con DDD (`domain/` → `application/` → `infrastructure/`) en `core/iam`, `core/audit`, `modules/calls`, `modules/zoho/crm` y cada subcontexto de `modules/loyalty/*` (catalog, cart, ordering, rewards, coupons, referrals, customers, fraud, notifications, pricing, branding). Allí:

- Dependencias solo hacia adentro. `domain/` es TypeScript puro: no importa `react`, `next` ni `infrastructure/`.
- Los use cases devuelven `Result` (de `shared/domain/result.ts`) para errores de negocio y extienden `UseCase`.
- Los adaptadores se enchufan en el composition root de cada módulo (`infrastructure/di/*-container.ts`, funciones `make…()`). Cambiar un adaptador no debe tocar `domain/` ni `application/`.
- Lo que cruza server → client son DTOs planos, nunca instancias de entidades.

`reviews`, `pixels`, `n8n` y `ai-support` son más ligeros (`domain/`, `server/`, `lib/`, `ui/`). Al tocarlos, mantener su estilo; no reestructurarlos por costumbre.

Persistencia: Firestore mediante `adminFirestore()` de `shared/infrastructure/firebase-admin.ts` (solo servidor). Colecciones multi-negocio: `businesses`, `business_slugs` (reserva única del slug), `business_members` (`<businessId>_<uid>`), `customer_links` (`<uid>_<businessId>`, para "mis tarjetas"), y subcolecciones `businesses/{id}/customers/{uid}` con sus `events`. Se diseñaron sin índices compuestos (el proyecto no tiene plan de pago). Otras colecciones: `crm_web_leads`, `pixel_sites`, `pixel_events`, `pixel_rate_limits`, `review_campaigns|invitations|links|visits|participants|rate_limits`, `calls`, `business_phone_numbers`, `audit_log`, `ai_support_rate_limits`, y las de loyalty (`products`, `orders`, `coupons`, `wallet_ledger`, `referrals`, `customer_profiles`, `fraud_alerts`, `notifications`, `notification_prefs`, `brandProfiles`). Ningún cliente accede a Firestore directamente: las reglas deben denegar todo y los handlers usan Admin SDK.

## Multi-negocio y áreas de miembros

El producto aprobado (ver "Alcance") es **un solo sistema para varios negocios** (supermercados, restaurantes): cada negocio y cada cliente inicia sesión y ve solo su información. Guía completa: `docs/tenancy.md`. Reglas que no se negocian:

- **El negocio y la persona salen del servidor, nunca del cliente.** `businessId` se resuelve desde el slug de la URL y el `userId` desde la sesión verificada. Ningún handler lee un `businessId`, `userId` o `email` del cuerpo de la petición.
- **Toda lectura de datos de negocio pasa por la puerta:** `requireBusinessAccess(slug, permiso?)` en páginas y `checkBusinessApiAccess(slug, permiso?)` en APIs (`lib/auth/business-access.ts`), que usan `ResolveBusinessAccess`. Sin rol en ese negocio: 404 en páginas, 403 en APIs.
- **Sesión `member`:** cualquier cuenta verificada, sin habilitación administrativa (`/api/auth/session` con `audience: "member"`). Prueba quién eres, no qué puedes ver. Una sesión `member` jamás abre módulos de plataforma, y el proxy y el layout raíz lo comprueban.
- **Roles por negocio:** `owner` (todo) y `staff` (solo validar visitas; no ve la lista de clientes). Los administradores de Cirix (claim `operator`) entran a cualquier negocio.
- **Páginas bajo `/biz/<slug>`** heredan la comprobación de membresía de `app/biz/[slug]/layout.tsx`; no añadir páginas que la esquiven.
- **Sin server actions en áreas de miembro:** el proxy las mantiene privadas. Las escrituras van por `/api/member/*` (mismo origen, validación con Zod, límite de tamaño).
- **Cualquier `*Repository` de datos de negocio recibe `businessId` explícito.** Los clientes viven en `businesses/{id}/customers/{uid}`, de modo que una consulta solo puede ver un negocio.
- **Códigos de escaneo:** el QR del cliente lleva un código firmado (HMAC) que vence a los 90 s y nombra a su negocio; un código de otro negocio se rechaza como falso. La espera mínima entre sellos (5 min) debe seguir siendo mayor que la vida del código: es lo que impide sumar un sello con una captura o un doble escaneo.
- **QR de mesa:** es fijo e impreso, así que una foto suya sirve desde cualquier lugar; esto es un riesgo aceptado por el cliente. Por eso está apagado por defecto, exige una espera de al menos 60 min, el dueño puede cambiar su código (los impresos dejan de sellar) y cada sello guarda su origen (`source: "table_qr"`, sin empleado). El canje del premio sigue siendo presencial: siempre lo hace el personal escaneando el QR personal del cliente.
- Crear negocios y nombrar dueños: `node scripts/manage-business.mjs` (ver "Comandos"). El personal lo agrega y quita el dueño en `/biz/<slug>/team`; un dueño **no** puede crear, degradar ni quitar dueños (`roleCanManage` en `member-role.ts`), y un negocio nunca queda sin dueño.

## Acceso y seguridad

`proxy.ts` deniega por defecto. Públicos: `/`, `/login`, `/privacy`, assets listados en `lib/auth/route-access.ts` y los endpoints de servicio (`/api/contact`, `/api/pixels/collect`, `/api/reviews/events`, `/api/auth/session`, webhooks de Twilio y Resend, cron). Todo lo demás exige sesión.

- Hay tres tipos de sesión (`lib/auth/audience.ts`): `platform` (cuenta habilitada con `platformAccess`; el operador agrega `operator`), `reviews` (cuenta verificada, solo `/make-a-review` y `/review`) y `member` (cuenta verificada para `/me`, `/b/*`, `/biz/*` y `/api/member/*`, autorizada por negocio). El login elige el tipo según la ruta de destino (`from`).
- Hay **dos barreras** de acceso que deben coincidir: `proxy.ts` y el layout raíz (`requiresPlatformAccess` en `lib/auth/route-access.ts`). Al abrir una ruta a otro tipo de cuenta, cambia esa función, no solo el proxy; las pruebas de `member-routes.test.ts` comprueban que concuerden.
- Dar acceso: `node scripts/manage-platform-user.mjs --email x@y.com --grant [--operator] --confirm`; revocar con `--revoke`. `OPERATOR_EMAILS` solo asigna el rol a quien ya pasó la verificación.
- Defensa en profundidad: layouts, handlers (`checkApiAccess`) y server actions vuelven a verificar el acceso aunque el proxy ya lo haya hecho.
- Los endpoints públicos validan por su cuenta: `/api/contact` (CORS por `CONTACT_ALLOWED_ORIGINS`, honeypot, límite de tamaño), webhooks (firma), cron (`Authorization: Bearer $CRON_SECRET`).
- El service worker (`public/sw.js`) solo cachea assets públicos; nunca HTML, RSC ni APIs. Subir `CACHE_NAME` ante cambios.

## Convenciones

- **Idioma:** código, identificadores y comentarios en inglés. Documentos del repo en español.
- **i18n:** `es` y `en`, por defecto `en` (`lib/locale.ts`). Los textos van en objetos `Record<Locale, …>` junto a cada pantalla y se eligen con `pick(locale, copy)`; los enlaces internos pasan por `localizeHref`. No hardcodear texto en un solo idioma.
- **Commits:** Conventional Commits en inglés, sin emoji (`feat(reviews): …`, `fix(auth): …`, `style(…)`, `docs: …`).
- **Diseño:** `DESIGN.md` es la fuente visual. Usar tokens semánticos (`bg`, `surface`, `accent`, `action`…), nunca colores de cliente en componentes compartidos. Áreas táctiles de 44 px, `focus-visible` y contraste AA.
- **Mobile-first**, sobre todo en tienda y demos.
- **Privacidad:** en Pixel Hub y Reviews, respetar consentimiento, GPC/DNT y retención documentada; no registrar IP, emails ni cuerpos de formularios en logs.

## Verificación antes de dar una tarea por terminada

1. `npm run lint`
2. `npx tsc --noEmit` (después de un build o `next typegen`)
3. `npm test`: debe pasar completo (hoy: 32 archivos, 572 pruebas, más 12 de integración opcionales). Si tocaste tenancy, CRM o repositorios de Firestore, corre también la prueba de integración: los fakes en memoria no demuestran transacciones ni idempotencia reales
4. `npm run build`
5. Si tocaste colores o temas: `node scripts/check-contrast.mjs`
6. Si tocaste auth, rutas públicas o el proxy: revisar `lib/auth/route-access.ts` y las pruebas `platform-*.test.ts`
7. Probar a mano en el navegador el flujo afectado; los tests simulan la red y no prueban Firebase, Zoho, Twilio ni Resend reales

## Integración con la landing (`Cirix`)

La web estática hace `POST https://cirixadv.com/api/contact` y usa Pixel Hub (`js/pixel-config.js` con el Site ID del sitio registrado). El formulario responde `201` (guardado y sincronizado con Zoho), `202` (guardado, Zoho falló) o error; ambos exitosos devuelven `trackingEventId` para la conversión `generate_lead`. Al cambiar el contrato de `/api/contact`, la respuesta o los orígenes permitidos, publicar primero esta plataforma y después la landing. Detalles en `docs/contact-crm.md` y `docs/pixel-hub.md` del repo `Cirix`.
