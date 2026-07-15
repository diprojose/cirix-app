# mixmag

**mixmag** es una **tienda virtual por encargo** —postres artesanales y también artículos de supermercado / alimenticios— construida como aplicación web progresiva (**PWA**) con Next.js. Incluye además una **sección de suscripción** donde las personas suscritas acceden a las recetas de los pasteleros (video tutoriales, imágenes y recetas paso a paso).

El desarrollo está **enfocado en la experiencia mobile (mobile-first)**: el móvil es el escenario principal y se diseña y prueba primero para él. El escritorio es secundario — debe funcionar y verse correctamente, pero no manda las decisiones de diseño.

El objetivo central del proyecto es que la aplicación:

1. **Se instale como app en Android** (mediante el prompt de "Agregar a la pantalla de inicio" / `beforeinstallprompt`).
2. **Se instale como app en iOS / iPadOS** (mediante "Agregar a la pantalla de inicio" en Safari, con soporte de icono y splash screens).
3. **Funcione con normalidad en el navegador de escritorio y móvil** (experiencia responsive y accesible sin necesidad de instalar).

> Las reglas de código (todo en inglés) y de commits (Conventional Commits con emoji, sin co-autor de Claude) están definidas en las reglas globales del usuario y **también aplican aquí**. Este documento no las repite; se enfoca en lo específico del proyecto y de la PWA.

---

## Producto / dominio

Dos grandes áreas funcionales:

### 1. Tienda por encargo (postres + supermercado)

- **Catálogo de productos** organizado por **departamento** (`Postres`, `Supermercado`; ampliable), con imágenes de alta calidad — clave en el rubro.
- **Todo por encargo:** los productos se hacen/preparan a pedido, **no hay stock ni inventario**. El flujo contempla fecha de entrega/retiro, personalización y confirmación del pastelero.
- **Carrito y checkout** pensados para móvil (formularios cortos, pocos pasos).
- Estados del pedido claros para el cliente (recibido, en preparación, listo, entregado).

> El agregado del catálogo es `Product` (raíz), clasificado por el value object `Department` y con `imageUrl` opcional. La home (`app/page.tsx`) es su adaptador primario y se organiza por departamento.

### 2. Suscripción a recetas

- **Contenido premium tras suscripción:** video tutoriales, imágenes y recetas paso a paso de los pasteleros.
- El acceso al contenido de recetas **requiere una suscripción activa** — proteger estas rutas/recursos en el servidor, nunca solo ocultándolos en el cliente.
- Contemplar reproducción de video optimizada para móvil y datos limitados.

> Al implementar features, ubicarlas mentalmente en una de estas dos áreas (tienda vs. suscripción) y respetar sus reglas de acceso: la tienda es pública/checkout; las recetas son contenido cerrado por suscripción.

---

## Stack

- **Framework:** Next.js **16** (App Router, **Turbopack** por defecto en dev y build)
- **UI:** React **19** + TypeScript
- **Estilos:** Tailwind CSS **v4**
- **Service Worker / offline:** **service worker manual en `public/sw.js`**, registrado desde un componente cliente. Es el camino que recomienda la guía oficial de PWA de Next 16.
- **Deploy sugerido:** Vercel (HTTPS automático, requisito obligatorio para PWA).

> **Por qué SW manual y no Serwist / next-pwa:** en Next 16 el bundler por defecto es Turbopack, y `@serwist/next` (como `next-pwa`) depende de configuración de **webpack**, por lo que su plugin no se ejecuta en el build por defecto. Un `public/sw.js` estático es agnóstico del bundler y no se rompe con Turbopack. Si en el futuro se necesita precache automático del build, evaluar Serwist forzando el build con webpack — pero no es el enfoque actual.

> Next 16 tiene **breaking changes** respecto a versiones previas. Antes de escribir código de Next, consultar la doc incluida en `node_modules/next/dist/docs/` (ver `AGENTS.md`).

---

## Arquitectura: hexagonal + DDD

Todo el código de negocio sigue **arquitectura hexagonal (puertos y adaptadores) con DDD**. La capa `app/` de Next es solo la capa de entrega (adaptadores primarios); el dominio **no conoce el framework**. `modules/catalog/` es la implementación de referencia — copiar su estructura para cada contexto nuevo.

### Módulos (bounded contexts)

Cada área funcional es un **módulo** en `modules/<context>/` con tres capas fijas, más un **shared kernel** transversal en `shared/`. Todo se importa con el alias `@/*` (raíz).

```
modules/<context>/
  domain/          # entidades, value objects, puertos (contratos), errores — TS puro
  application/     # use cases, DTOs — orquesta el dominio
  infrastructure/  # adapters concretos (repos), mappers, composition root (di/)
shared/
  domain/          # Result, DomainError, Entity, AggregateRoot, ValueObject, Identifier
  application/      # UseCase
```

> **`modules/catalog/` es la plantilla.** Los contextos pendientes — `ordering` (pedidos/checkout), `subscription`, `recipes` — se crean copiándola. `recipes` debe proteger el acceso por suscripción **en el servidor** (ver "Suscripción a recetas").

### Regla de dependencias (obligatoria)

Las dependencias apuntan **solo hacia adentro**: `app/ → infrastructure/ → application/ → domain/`.

- `domain/` **no** importa de `application/`, `infrastructure/`, `app/`, `react` ni `next`. Es TS puro.
- `application/` importa **solo** su `domain/` + el shared kernel. Depende de **interfaces** de repositorio, nunca de implementaciones.
- `infrastructure/` implementa los puertos declarados en `domain/`. Sustituir un adapter (in-memory → base de datos) **no debe tocar** dominio ni aplicación.

### Patrón repositorio + inversión de dependencias

- El **contrato** (puerto) es una `interface` en `domain/repositories/`.
- La **implementación** (adapter) va en `infrastructure/persistence/`. El adapter de referencia es **in-memory**.
- **DI = composition root manual** en `infrastructure/di/<context>-container.ts`: único lugar que instancia adapters concretos y los **inyecta por constructor** a los use cases, vía factories `make…()`. Sin decoradores ni `reflect-metadata` (compatible con Turbopack y RSC).

### Abstracciones del kernel

- **`Result<T, E>`** (`shared/domain/result.ts`): unión discriminada de objetos planos `{ ok: true, value } | { ok: false, error }`. Los use cases **devuelven `Result`**, no lanzan excepciones, para fallos de negocio esperados. Helpers `ok` / `err` / `isOk` / `isErr`.
- **`UseCase<TInput, TOutput>`** (`shared/application/use-case.ts`): `execute(input): Promise<Result<TOutput, DomainError>>`.
- **`DomainError`** (`shared/domain/domain-error.ts`): base de errores de negocio, con `code` estable para mapear a HTTP/UI en el borde.
- Bloques tácticos DDD: `Entity`, `AggregateRoot`, `ValueObject`, `Identifier`.

### Borde RSC (serialización)

`Result`, DTOs y errores que **crucen el borde server→client** deben ser **objetos planos serializables**. Las instancias de clase (entidades, value objects, `DomainError`) se quedan del lado servidor: los use cases devuelven **DTOs** (`application/dtos/`) y los errores se mapean a `{ code, message }` en el adaptador primario antes de cruzar al cliente.

### Verificación de arquitectura

- `npx tsc --noEmit` y `npm run build` sin errores.
- Ningún archivo bajo `domain/` o `application/` importa `next`, `react` ni `infrastructure/`.
- Reemplazar el adapter en `di/<context>-container.ts` no requiere tocar `domain/` ni `application/`.

---

## Regla de oro: la instalabilidad no se rompe

Cualquier cambio que toque el manifest, el service worker, los iconos o los meta tags **debe mantener la PWA instalable en Android y iOS y navegable en web**. Si un cambio afecta a estos artefactos, verificar con la checklist de abajo antes de dar la tarea por terminada.

Los tres artefactos que hacen instalable la app son:

1. **Web App Manifest** — `app/manifest.ts` (Next lo sirve en `/manifest.webmanifest`).
2. **Service Worker** — `public/sw.js`, registrado desde `components/pwa-installer.tsx`, sirviendo la app offline.
3. **Iconos + meta tags** — para Android (manifest) e iOS (apple-touch-icon + splash).

---

## 1. Web App Manifest

Definir en `app/manifest.ts` usando la API `MetadataRoute.Manifest` de Next.js. Campos obligatorios:

```ts
import type { MetadataRoute } from "next";

/**
 * Web App Manifest for the mixmag PWA.
 * Enables install prompts on Android and standalone launch on all platforms.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "mixmag — postres por pedido",
    short_name: "mixmag",
    description: "…",
    start_url: "/",
    scope: "/",
    display: "standalone",       // sin barra de navegador al abrir instalada
    background_color: "#ffffff",
    theme_color: "#e0669a",
    orientation: "portrait",
    icons: [
      { src: "/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

Requisitos no negociables del manifest:

- `display: "standalone"` (o `minimal-ui`) — sin esto Android no ofrece instalar.
- `start_url` válido.
- Al menos un icono **192×192** y uno **512×512** PNG.
- Al menos un icono con `purpose: "maskable"` (Android lo recorta a la forma del sistema).
- `theme_color` y `background_color` coherentes con el diseño.

---

## 2. Service Worker (offline)

- Vive en `public/sw.js` (JavaScript plano, servido tal cual desde la raíz — scope `/`).
- Lo **registra** el componente cliente `components/pwa-installer.tsx`, montado en `app/layout.tsx`.
- Estrategias implementadas:
  - **Precache** del app shell mínimo (`/`, `/offline`, `/manifest.webmanifest`) en el evento `install`.
  - **Navegaciones:** network-first → cache → fallback a `/offline` (ruta `app/offline/page.tsx`).
  - **Assets estáticos:** stale-while-revalidate.
- **Versionado:** subir `CACHE_VERSION` en `public/sw.js` ante cualquier cambio; el `activate` purga cachés viejas.
- **No cachear** respuestas de APIs autenticadas ni contenido de recetas (suscripción) sin control explícito.
- Incluye handlers `push` / `notificationclick` listos para activar Web Push más adelante (falta generar claves VAPID y persistir suscripciones — ver la guía en `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`).
- Cabeceras de `/sw.js` (`Cache-Control: no-store`) configuradas en `next.config.ts` para que el navegador siempre reciba la última versión.

---

## 3. iOS / iPadOS (Safari) — el caso especial

iOS **no** usa el manifest para el icono ni el splash. Requiere meta tags y links explícitos en el `<head>`. Definirlos en el `metadata` / `viewport` del root layout (`app/layout.tsx`):

```ts
export const metadata: Metadata = {
  title: "mixmag",
  appleWebApp: {
    capable: true,                 // apple-mobile-web-app-capable
    title: "mixmag",               // nombre bajo el icono
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  // viewportFit: "cover" si se usa safe-area en pantallas con notch
};
```

Checklist iOS:

- **`apple-touch-icon`** en `app/apple-icon.png` (180×180, PNG, **sin transparencia** — iOS pone fondo negro donde hay alpha).
- **`appleWebApp.capable: true`** para lanzar en modo standalone.
- **Splash screens** (`apple-touch-startup-image`) por tamaño de dispositivo si se quiere pantalla de arranque nativa (opcional pero recomendado para pulido).
- Respetar **safe areas** con `env(safe-area-inset-*)` para no quedar bajo el notch / barra de gestos.
- iOS no muestra prompt de instalación: la instalación es manual (Compartir → "Agregar a la pantalla de inicio"). No asumir `beforeinstallprompt` en iOS.

---

## 4. Android / Chromium

- El manifest + service worker válidos disparan el evento `beforeinstallprompt`.
- Capturar ese evento para ofrecer un botón de instalación propio (mejor UX que esperar al banner del navegador). Guardar el evento y llamar a `prompt()` bajo interacción del usuario.
- Probar el icono **maskable** en [maskable.app](https://maskable.app) para que no se recorte mal.

---

## Mobile-first / navegador

- **Mobile-first es la prioridad:** diseñar y probar primero en móvil (viewport ~360–430px), luego escalar hacia arriba. El escritorio debe verse y funcionar bien, pero no dicta las decisiones de layout.
- Objetivos de UX móvil: áreas táctiles ≥ 44px, formularios de checkout cortos, navegación al alcance del pulgar, contenido legible sin zoom.
- Cuidar el rendimiento en redes móviles: imágenes optimizadas (`next/image`), lazy loading de video, evitar bundles pesados.
- Meta viewport correcto (Next.js lo incluye; añadir `viewportFit: "cover"` solo si se usan safe-areas).
- Nada debe depender de estar instalado: toda función clave funciona también en pestaña de navegador.

---

## Estructura de carpetas (referencia)

```
app/
  layout.tsx            # metadata + viewport (incl. apple-web-app) + <PwaInstaller/>
  manifest.ts           # Web App Manifest → /manifest.webmanifest
  apple-icon.png        # apple-touch-icon 180x180 (auto-detectado por Next)
  icon.png              # icono base 512 (favicon PNG)
  favicon.ico           # favicon clásico
  offline/page.tsx      # fallback offline servido por el SW
  page.tsx              # adapter primario: home pública (catálogo por departamento, mobile+web)
  menu/page.tsx         # adapter primario: Server Component → use case del catálogo
shared/                 # shared kernel (agnóstico de dominio)
  domain/               # Result, DomainError, Entity, AggregateRoot, ValueObject, Identifier
  application/          # UseCase
modules/                # bounded contexts (hexagonal + DDD)
  catalog/              # módulo de referencia (productos: postres + supermercado)
    domain/             # Product, Money, ProductId, Department, ProductRepository (puerto), errores
    application/        # use cases (list available/featured, get by id) + ProductDto
    infrastructure/     # InMemoryProductRepository, seed, di/catalog-container.ts
components/
  store/                # componentes presentacionales de tienda (cards, chips, navs, thumb)
  pwa-installer.tsx     # 'use client': registra el SW + botón instalar (Android) + hint iOS
public/
  sw.js                 # service worker (offline + push-ready)
  icon-192x192.png      # iconos del manifest (any)
  icon-512x512.png
  icon-maskable-192x192.png   # iconos maskable (Android)
  icon-maskable-512x512.png
next.config.ts          # headers de seguridad + Cache-Control de /sw.js
```

> Los iconos actuales son **placeholders de color sólido**. Reemplazarlos por el arte real de mixmag (mantener tamaños y que el maskable tenga zona de seguridad).

---

## Verificación antes de terminar una tarea de PWA

Siempre que se toque manifest, SW, iconos o meta tags, verificar:

1. `npm run build` sin errores y `/manifest.webmanifest` + `/sw.js` accesibles.
2. **Lighthouse → categoría PWA** en verde (installable + PWA optimized). Correr en build de producción (`npm run build && npm start`), no en dev. Para probar Web Push localmente usar `next dev --experimental-https`.
3. **Android (Chrome):** aparece la opción de instalar; al abrir instalada arranca en `standalone` sin barra de URL.
4. **iOS (Safari):** "Agregar a la pantalla de inicio" muestra el icono correcto (sin fondo transparente roto) y abre en standalone.
5. **Offline:** con red desactivada, el app shell sigue cargando.
6. **Navegador de escritorio:** todo funciona sin instalar.

Si algún punto falla, la tarea no está completa.
