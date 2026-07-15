# DESIGN.md — Sistema de diseño de mixmag

> Fuente de verdad visual de mixmag, derivada de una referencia de app de repostería (pantallas Home / Detalle / Carrito).
> Estética: suave, redondeada, apetecible y aireada. Acento **rosa** único y tonal. Registro **producto** (el usuario está en una tarea: navegar → elegir → pagar) con **momentos de color "committed"** en las tarjetas de marca.
>
> Las reglas de código (inglés) y de commits viven en las reglas globales; la PWA y el dominio (hexagonal + DDD) viven en `CLAUDE.md`. Este archivo solo define lo **visual**.

## Decisiones fundacionales

1. **Color:** un único acento **rosa** con variaciones tonales (sin violeta). El acento **puede cambiar**: el sistema usa una capa semántica swappable (`--color-accent*`), así re-tematizar es editar un solo lugar.
2. **Tipografía:** **Poppins** (sans geométrico redondeado y amable).
3. **Tema:** **light por decisión**, no por defecto. Escena: alguien navegando postres en el teléfono, en un entorno luminoso; el rosa claro y aireado hace que la comida "antoje". Un ramp dark queda fuera de alcance por ahora.
4. **Dominio sin tocar:** `DessertDto` = `{ id, name, description, priceCents, currency, available }`. No hay `imageUrl`, `category`, `rating` ni `deliveryTime`. Por eso: imágenes = placeholder, chips de categoría = presentacionales, y los chips "delivery/rating" de la referencia se **adaptan** a semántica por-encargo.

### Regla de contraste (WCAG AA) — crítica
Texto blanco sobre el rosa vibrante `#e0669a` (`brand-500`) **no cumple AA** (~2.3:1). Por tanto:
- **Rellenos interactivos con texto blanco** (CTA primario, botón "+", chip activo) → rosa profundo (`brand-700`/`accent-fill`, o degradado `accent-strong → brand-800`). Verificar ≥ 4.5:1.
- **Superficies decorativas** (card destacada, resumen) → rosa claro (`accent-soft`/`brand-100`) con texto oscuro.
- Alternativa para un CTA de rosa vibrante: etiqueta en **tinta oscura** (`sugar-950`) en vez de blanco (~5.7:1).

---

## 1. Design tokens (Tailwind v4 `@theme`)

Estos tokens reemplazan el `@theme inline` mínimo actual de `app/globals.css`. Nomenclatura: **`brand`** = ramp rosa; **`sugar`** = neutrales tintados de rosa (nunca `#000`/`#fff`). Todo en **OKLCH**, anclado a `brand-500 = #e0669a`.

```css
@import "tailwindcss";

@theme {
  /* ---- Ramp de marca (rosa) ---- */
  --color-brand-50:  oklch(0.971 0.013 350);
  --color-brand-100: oklch(0.940 0.030 350);
  --color-brand-200: oklch(0.898 0.055 350);
  --color-brand-300: oklch(0.835 0.088 350);
  --color-brand-400: oklch(0.755 0.125 350);
  --color-brand-500: oklch(0.680 0.155 350); /* #e0669a — base de marca */
  --color-brand-600: oklch(0.610 0.170 352); /* ~ #d1508a (hover actual) */
  --color-brand-700: oklch(0.530 0.162 354);
  --color-brand-800: oklch(0.445 0.132 356);
  --color-brand-900: oklch(0.370 0.102 357);
  --color-brand-950: oklch(0.280 0.072 358);

  /* ---- Neutrales tintados (sugar) ---- */
  --color-sugar-0:   oklch(0.995 0.003 350); /* superficie / cards */
  --color-sugar-50:  oklch(0.982 0.006 350); /* fondo de página */
  --color-sugar-100: oklch(0.962 0.007 348);
  --color-sugar-200: oklch(0.922 0.008 346); /* bordes hairline */
  --color-sugar-300: oklch(0.862 0.009 344);
  --color-sugar-400: oklch(0.720 0.010 340); /* iconos inactivos / placeholder */
  --color-sugar-500: oklch(0.605 0.012 338); /* texto muted / subtítulo */
  --color-sugar-600: oklch(0.500 0.013 336);
  --color-sugar-700: oklch(0.400 0.014 334); /* body */
  --color-sugar-800: oklch(0.305 0.014 332);
  --color-sugar-900: oklch(0.235 0.015 330); /* títulos */
  --color-sugar-950: oklch(0.180 0.013 328); /* casi-negro: filtro, chip activo, "+" */

  /* ---- Capa semántica (SWAPPABLE — "puede cambiar" se edita aquí) ---- */
  --color-bg:            var(--color-sugar-50);
  --color-surface:       var(--color-sugar-0);
  --color-border:        var(--color-sugar-200);
  --color-text:          var(--color-sugar-900);
  --color-text-muted:    var(--color-sugar-500);
  --color-ink:           var(--color-sugar-950); /* controles casi-negros */
  --color-accent:        var(--color-brand-500); /* marca / superficies vibrantes */
  --color-accent-strong: var(--color-brand-600); /* hover / press */
  --color-accent-fill:   var(--color-brand-700); /* relleno CTA con texto blanco (AA) */
  --color-accent-soft:   var(--color-brand-100); /* superficies decorativas */
  --color-accent-subtle: var(--color-brand-50);  /* rellenos tenues */
  --color-on-accent:     var(--color-sugar-0);   /* texto sobre accent-fill */
  --color-danger:        oklch(0.585 0.210 25);  /* solo swipe-to-delete */
  --color-on-danger:     var(--color-sugar-0);

  /* ---- Radios ---- */
  --radius-sm:   0.75rem;    /* 12 — chips info interior, precio pill */
  --radius-md:   1rem;       /* 16 — thumbnails, cards pequeñas */
  --radius-lg:   1.5rem;     /* 24 — cards de producto, line items */
  --radius-xl:   2rem;       /* 32 — card destacada, resumen, hero */
  --radius-pill: 62.4375rem; /* píldora total: botones, chips, nav, stepper */

  /* ---- Sombras (difusas, tintadas de rosa) ---- */
  --shadow-xs:     0 1px 2px oklch(0.68 0.155 350 / 0.08);
  --shadow-card:   0 10px 30px -12px oklch(0.60 0.14 348 / 0.22);
  --shadow-float:  0 14px 34px -10px oklch(0.50 0.13 340 / 0.26);
  --shadow-accent: 0 12px 26px -8px oklch(0.53 0.162 354 / 0.45);

  /* ---- Motion ---- */
  --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1);

  /* ---- Tipografía ---- */
  --font-sans: var(--font-poppins), ui-sans-serif, system-ui, sans-serif;
}
```

**Ajustes asociados en `globals.css` (al implementar):**
- Eliminar `body { font-family: Arial, Helvetica, sans-serif }` → dejar mandar `--font-sans` (Poppins).
- Fijar `background: var(--color-bg); color: var(--color-text)` en `body`.
- Quitar/neutralizar el `@media (prefers-color-scheme: dark)` en superficies de tienda (compromiso light).

**Wiring de Poppins** (`app/layout.tsx`): `next/font/google` → `Poppins({ weight: ["400","500","600","700"], subsets: ["latin"], variable: "--font-poppins" })`, aplicar `.variable` al `<html>`. Geist Mono puede quedar para datos monospace.

---

## 2. Tipografía

Poppins, escala rem fija (registro producto), ratio ~1.2. Pesos cargados: 400 / 500 / 600 / 700.

| Rol | Tamaño / interlínea | Peso | Tracking | Uso |
|---|---|---|---|---|
| `display` | 1.75rem / 2rem | 700 | -0.02em | Título de Detalle ("Torta de chocolate") |
| `price-lg` | 1.5rem / 1.75rem | 700 | tabular-nums | Precio grande (badge Detalle, total Carrito) |
| `h-section` | 1.125rem / 1.5rem | 600 | -0.01em | "Top Product", "Most Ordered", "Ingredients" |
| `title` | 1rem / 1.375rem | 600 | — | Nombre en card / line item |
| `body` | 0.9375rem / 1.5 | 400 | — | Descripción, texto general |
| `label` | 0.8125rem / 1.25 | 500 | — | Chips, precio en card, links "Ver todo" |
| `caption` | 0.75rem / 1 | 500 | — | Subtítulo muted, etiqueta de badge |

Prosa (descripciones) capada a 65–75ch. Precios/montos siempre `tabular-nums`, formateados en el borde con `Intl.NumberFormat("es", { style: "currency", currency })` desde `priceCents / 100`.

---

## 3. Tema y swappability

- **Fuente única del acento:** ningún componente usa `brand-*` directo; todos consumen la capa semántica (`accent`, `accent-fill`, `accent-soft`, `on-accent`…). Cambiar de rosa a otro color = reescribir el ramp `brand-*` (o reapuntar `--color-accent*`). Nada más se toca.
- **`theme_color` de la PWA** (`app/manifest.ts` + `viewport` en `layout.tsx`) permanece **`#e0669a`** (marca), independiente del acento de UI salvo decisión explícita.
- **Contraste (AA):** rellenos con texto blanco → `accent-fill` (brand-700) o degradado `accent-strong → brand-800`; superficies claras → `accent-soft` con `text`. Verificar ≥ 4.5:1 (normal) / 3:1 (≥18.66px bold).
- **Motion:** 150ms estado · 200ms default · 300ms reveal. Solo `ease-out` exponenciales; sin bounce/elastic; nunca animar propiedades de layout; respetar `prefers-reduced-motion`.

---

## 4. Componentes

Convención transversal: touch target ≥ **44px**, foco visible (`ring` 2px `accent` con offset), estados `default/hover/active/focus/disabled` en todo lo interactivo. Ubicación sugerida: `components/store/*` (presentacionales; `"use client"` solo donde hay interacción).

### 4.1 `AppScreen` (shell)
- Columna mobile centrada: `max-w-[26rem]` (≈420px), `mx-auto`, `px-5` (20px).
- Fondo `bg` con degradado sutil rosa al tope opcional (`accent-subtle → bg`).
- **Sin barra de estado falsa** (el "9:41 / señal / batería" es chrome del mockup).
- Safe areas: `env(safe-area-inset-top)` en header, `env(safe-area-inset-bottom)` en nav/CTA.
- Desktop (≥ md): columna centrada; filas de cards pueden expandir a grid 2–3 col. Mobile manda.

### 4.2 `HomeHeader`
Avatar (44px círculo, `object-cover`) + texto (`caption` muted "Buenos días" + `title` nombre) a la izquierda; **botón campana** a la derecha (44px círculo, `surface`, `shadow-xs`, icono `ink`, punto `accent` opcional de notificación).

### 4.3 `SubHeader` (Detalle / Carrito)
**Back** (44px círculo `surface` + `shadow-xs`) · **título centrado** (`title`) · **acción trailing** (share en Detalle / kebab en Carrito, 44px círculo).

### 4.4 `SearchBar`
Píldora `radius-pill`, `surface`, altura 48px, `shadow-xs`. Lupa `sugar-400` + placeholder "Busca tu postre" (`body` muted). **Botón filtro** trailing: 44px círculo `bg-ink` + icono sliders blanco. Focus → `ring` accent. El filtro abre bottom sheet (no modal).

### 4.5 `CategoryChips` (presentacional — sin datos)
Fila scroll horizontal, `gap-2`, sin scrollbar. Chips `radius-pill`, ~40px, `px-4`.
- **Activo:** `bg-ink` + texto blanco (+ thumbnail 28px circular opcional).
- **Inactivo:** `surface` + texto `sugar-700` + borde `border`.
- Contenido estático (repostería): `Todos · Tortas · Cheesecakes · Galletas · Cupcakes`. Filtro solo visual hasta que exista `category` en el dominio.

### 4.6 `SectionHeader`
Título `h-section` (`text`) + link "Ver todo" a la derecha (`label`, color `accent`, sin subrayado, hover `accent-strong`).

### 4.7 `FeaturedCard` (destacada)
`radius-xl` (32), fondo `accent-soft` con **blob decorativo** (SVG/gradiente `brand-200` baja opacidad, `absolute`, `overflow-hidden`).
- Izquierda: chip-tag opcional ("Nuevo"), **título** (`display`, 2 líneas, `text`), **precio** (`title`, `text`).
- Derecha: **imagen** placeholder (§4.18, `object-contain`, ~140px, desbordando el borde inferior).
- Inferior: **"Agregar"** (píldora `surface`, texto `ink`, `shadow-card`) + **favorito** (44px círculo `surface`, corazón; toggle relleno `accent`).

### 4.8 `ProductCard` (compacta)
Ancho ~160px (scroll) o grid 2-col. `radius-lg`. **Variación tonal** (en vez del rosa+lavanda de la referencia): alternar `accent-soft` (brand-100) y `sugar-100`. Imagen placeholder arriba (desbordando), **nombre** (`title`), **precio pill** abajo-izq (`surface`, `label`, tabular-nums), **botón "+"** abajo-der (36–40px círculo `bg-accent-fill`, "+" blanco, press `scale-95`).

### 4.9 `BottomNav` (flotante)
`fixed` inferior, centrada, `max-w`, píldora `radius-pill`, `surface`, `shadow-float`, respeta `safe-area-inset-bottom`, ~64px. 4 ítems: **Inicio · Favoritos · Carrito · Perfil** (iconos 24px).
- **Activo:** círculo 48px relleno `accent-fill` + icono blanco + leve elevación. **Inactivo:** icono `sugar-400`.
- Rutas al implementar: `/ · /favoritos · /cart · /account`. En Detalle/Carrito se oculta (el CTA ocupa el borde inferior).

### 4.10 `PrimaryButton` (CTA)
Píldora `radius-pill`, ancho completo, altura **56px**, texto `on-accent` (`label` 16/600). **Relleno accesible:** degradado `accent-strong → brand-800` (o plano `accent-fill`), `shadow-accent`.
- Estados: hover `brand-800`; active `scale-[0.98]` + sombra reducida; disabled `sugar-200` + texto `sugar-400`; loading spinner + label oculto. `transition` 200ms `--ease-out-quint`.

### 4.11 `ProductHero` + `PriceBadge` (Detalle)
Imagen a sangre sobre degradado rosa sutil (`accent-subtle → bg`), placeholder centrada (~260px). **`PriceBadge` flotante:** píldora-card `surface`, `radius-lg`, `shadow-card`, `absolute`; `caption` muted ("Por porción") + `price-lg`.

### 4.12 `QuantityStepper`
Píldora, `surface`, borde `border` (o `bg-sugar-100`). "−"/"+" (targets 36px, icono `sugar-700`) + contador en círculo `accent-fill` 32px (texto blanco). Altura 44. "−" deshabilitado en 1.

### 4.13 `InfoChips` (Detalle) — **adaptados a por-encargo**
Dos cards lado a lado, `radius-md`, `surface`, borde `border`, `p-3`. Icono/emoji + valor (`title`) + `caption` muted. Contenido adaptado (no "delivery/rating"): p.ej. **"Por encargo · Listo en 48h"** y **"Personalizable · Elige diseño"**. No inventar ratings/tiempos falsos.

### 4.14 `Description` + "Ver más"
`body` `sugar-700`, `line-clamp-3`, link inline "Ver más" color `accent`. Texto real desde `dessert.description`.

### 4.15 `IngredientsRow` (opcional / presentacional)
`SectionHeader` "Incluye" + fila de thumbnails ~56px `radius-md` (placeholder). Sin campo de dominio → estático u omitible.

### 4.16 `CartLineItem`
Row en card `surface`, `radius-lg`, `p-3`. Thumbnail 56–64px `radius-md` (placeholder) + **nombre** (`title`) + **subtítulo** (`caption` muted) + **precio pill** (`bg-sugar-100`, `label`, tabular-nums).
- **Swipe-to-delete:** arrastrar a la izquierda revela acción destructiva (`bg-danger`, papelera, texto `on-danger`). **Fallback no-gestual** para desktop/a11y (botón eliminar visible o long-press + confirm). `danger` es la única excepción semántica fuera del rosa.

### 4.17 `SummaryCard` (resumen)
`radius-xl`, fondo `accent-soft` con blob decorativo + cluster de imagen placeholder. Filas: "Entrega/Envío" + monto; "Total" (`caption`) + monto grande (`price-lg`). Montos con `Intl.NumberFormat("es", currency)`.

### 4.18 `DessertThumb` (placeholder de imagen)
Como `DessertDto` no tiene `imageUrl`: bloque `radius-md/lg` con degradado tintado (`accent-soft → brand-200`) + glifo de postre (🍰 o icono) centrado, determinístico por `id` para variar el tono. **Evolución:** cuando el dominio gane `imageUrl`, sustituir por `next/image` (`object-contain`, `sizes` mobile) sin cambiar el layout; registrar `images` remotePatterns en `next.config.ts`.

---

## 5. Pantallas → rutas / archivos

| Pantalla | Ruta destino | Estado | Datos / use case |
|---|---|---|---|
| **Home** (catálogo) | `app/page.tsx` (reemplaza boilerplate) | crear branded | `makeListAvailableDesserts()` (existe) → cards. Chips presentacionales. |
| **Detalle** | `app/menu/[id]/page.tsx` (nueva) | crear | `makeGetDessertById()` **ya existe y está sin usar** → enlazar. |
| **Carrito** | `app/cart/page.tsx` (nueva) | crear (presentacional) | Sin módulo de carrito aún (contexto `ordering` pendiente). Estado cliente / datos de ejemplo por ahora. |
| **Nav inferior** | componente global | crear | Rutas `/ · /favoritos · /cart · /account`. |

**Arquitectura (hexagonal + DDD):** las pantallas son **adaptadores primarios** (Server Components que llaman use cases y reciben DTOs planos); los componentes de tienda son presentacionales; el precio se formatea en el borde. El Detalle usa el `GetDessertById` existente. El Carrito real pertenecerá al futuro módulo `ordering`; hoy su spec es visual.

---

## 6. Adaptaciones y anti-slop

- **Por-encargo:** los info-chips de Detalle usan semántica real (encargo, personalización, fecha), no "delivery/rating".
- **PWA:** sin barra de estado falsa; safe-area en header/nav/CTA; nav flotante como patrón instalable; targets ≥44px.
- **Mobile-first → desktop:** columna `max-w-[26rem]` centrada; cards a grid 2–3 col ≥ md; sin tipografía fluida.
- **Bans evitados:** sin bordes laterales de acento (usar bordes completos / tintes de fondo); sin texto en degradado (precios/links en color sólido `accent`); glass evitado; sin plantilla hero-metric; cards **no** idénticas (destacada ≠ compacta; variación tonal); **sin modales** (bottom sheets / inline para filtros y confirmaciones).
- **Consistencia:** un solo shape language (píldoras + `radius-lg/xl`), un set de iconos (outline), mismos estados en todos los botones.

---

## 7. Verificación del sistema

1. **Compilación de tokens:** pegar el bloque `@theme` en `app/globals.css` (rama de prueba) y confirmar que Tailwind v4 genera utilidades (`bg-brand-500`, `text-sugar-900`, `rounded-xl`, `shadow-card`, `font-sans`).
2. **Contraste AA:** validar los pares críticos — `on-accent`/`accent-fill` (brand-700), `text`/`accent-soft` (brand-100), `text`/`surface`. Ajustar el ramp si algún par no llega a 4.5:1.
3. **Poppins:** confirmar que los pesos 400/500/600/700 cargan vía `next/font`.
4. **Cobertura referencia→spec:** cada elemento de las 3 pantallas tiene sección en §4 y ruta en §5.
5. **Swappability:** ningún componente referencia `brand-*` directo (solo la capa semántica `accent*`).
