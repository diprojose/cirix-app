# DESIGN.md — Sistema de diseño de mixmag

> Fuente de verdad visual de mixmag: **e-commerce de supermercado** para Florida, cuyo propósito es demostrar un programa de retención sobre el Ledger de Recompensas.
> Estética: **utilitaria y densa**. La compra de mercado es una tarea (llenar una canasta de 10-20 artículos), no un paseo. La foto del producto pone el color; la interfaz se aparta.
>
> Las reglas de código (inglés) y de commits viven en las reglas globales; el dominio (hexagonal + DDD), el Ledger y la PWA viven en `CLAUDE.md`. Este archivo solo define lo **visual**.

## Decisiones fundacionales

1. **Dos ejes de color, no uno.** **Verde** = marca y cromo. **Naranja** = valor y acción. Un control que el usuario pulsa para avanzar, o un número que representa dinero que ganó, es naranja. Todo lo demás es verde o neutro. Un solo color de acción en toda la app.
2. **Tipografía:** **Poppins** en 400/500/600/700. El peso 800 **no se carga**: pedir `font-extrabold` produce un faux-bold sintético.
3. **Tema:** **light por decisión**. Un supermercado es una escena luminosa y plana para que la verdura resalte. No hay rampa dark por ahora.
4. **Densidad:** 3 productos por fila en móvil, control de cantidad dentro de la card. Llenar una canasta no debe requerir abrir la ficha.
5. **Honestidad de datos (regla dura).** Ningún dato que el dominio no modele llega a la UI. Sin ratings, sin plazos de entrega, sin saldos inventados. Si un dato falla al cargar, no se dibuja como cero ni como vacío.

> **Historia:** este documento describía una pastelería por encargo con acento rosa, derivada de un mockup de repostería. Tras el pivote a supermercado se reescribió por completo. Si encuentras rosa, violeta, "postres" o "por encargo" en el código, es un resto del pivote.

---

## 1. Design tokens (Tailwind v4 `@theme`)

Implementados en `app/globals.css`. Nomenclatura: **`brand`** = rampa verde, **`action`** = rampa naranja, **`stone`** = neutrales tibios (nunca `#000`/`#fff`). Todo en OKLCH.

La **capa semántica** es lo único que consumen los componentes. Re-tematizar = reapuntar `--color-accent*` / `--color-action*`; ningún componente referencia `brand-*`, `action-*` ni `stone-*` directo salvo utilidades neutras (`bg-stone-100` para hovers).

```
--color-accent / accent-strong / accent-fill / accent-soft / accent-subtle / on-accent   → verde
--color-action / action-strong / action-fill / action-soft / action-subtle / on-action   → naranja
--color-bg / surface / border / text / text-muted / ink                                  → neutros
--color-danger / on-danger
```

### Contraste (WCAG AA) — verificado, no estimado

Los valores están calibrados para pasar AA y hay un script que lo comprueba (ver §6). Pares críticos:

| Par | Ratio |
|---|---|
| `on-accent` sobre `accent-fill` | 6.8:1 |
| `on-action` sobre `action-fill` | 6.9:1 |
| `text` sobre `surface` | 16.4:1 |
| `text-muted` sobre `bg` | 4.7:1 |
| `accent` como texto sobre `bg` | 4.7:1 |
| `action-800` sobre `action-soft` (badge de saldo) | 7.9:1 |

**Nunca** texto blanco sobre `action-500` ni `brand-500`: son tonos decorativos. Los rellenos con texto blanco usan siempre el paso `-700` (`accent-fill` / `action-fill`).

### Radios

Escala apretada: un registro denso pelea con esquinas de boutique.

```
sm 8 · md 12 · lg 16 · xl 24 · pill
```

`--radius-2xl` y `--radius-3xl` se **redefinen** como alias de `lg`/`xl`. Tailwind v4 `@theme` *extiende* en vez de reemplazar, así que sin eso `rounded-2xl` seguiría resolviendo a un valor fuera del sistema (era el radio de card de facto en 40 sitios).

### Tipografía

Declarada como tokens reales (`--text-*`), no como prosa. Usar `text-display`, `text-price-lg`, `text-h-section`, `text-title`, `text-body`, `text-label`, `text-caption`. **No** usar `text-[…]` arbitrarios.

| Rol | Tamaño / interlínea | Uso |
|---|---|---|
| `display` | 1.75rem / 2rem | Título de ficha, h2 de escritorio |
| `price-lg` | 1.5rem / 1.75rem | Precio de ficha, total del carrito |
| `h-section` | 1.125rem / 1.5rem | Encabezado de sección |
| `title` | 1rem / 1.375rem | Nombre en línea de carrito, CTA |
| `body` | 0.9375rem / 1.5 | Descripción, texto general |
| `label` | 0.8125rem / 1.25 | Nombre y precio en card, enlaces de nav |
| `caption` | 0.75rem / 1rem | Texto muted, notas |

Montos siempre `tabular-nums`, formateados con `formatPrice` (`lib/format/money.ts`), locale **`es-US`** → `$4.00`. El locale `es` a secas produce `4,00 US$`: incorrecto para Florida y casi el doble de ancho, lo que rompe una card de 3 columnas.

### Motion

Usar los tokens `ease-out-quint` / `ease-out-expo`. 150ms estado · 200ms default. Sin bounce. Nunca animar propiedades de layout.

`prefers-reduced-motion` se respeta **globalmente** en `globals.css`, no componente por componente: con ~20 sitios de motion, guardarlos uno a uno es exactamente cómo se terminó con solo 3 protegidos.

---

## 2. Layout

Contenedores centralizados en `components/store/layout.ts`. **Importarlos, nunca escribir `max-w-[26rem]` a mano** — así se llegó a tener gutter de 12px en la home y 20px en el resto, con la app saltando de lado al entrar al carrito.

```
COLUMN          móvil (header, secciones planas)   max-w-[26rem] px-4
CONTAINER       catálogo y grillas                 + md:max-w-6xl
CONTAINER_READ  formularios y lectura              + md:max-w-2xl
```

**Dos horizontes, una URL.** En móvil manda el shell de app (`HomeHeader` / `SubHeader`, `BottomNav` flotante, safe-areas). Desde `md` se conmuta al paquete web (`TopNav` + grilla ancha + `SiteFooter`) y el `BottomNav` se oculta. Los primitivos se comparten; cambia la composición. **Mobile-first manda las decisiones.**

---

## 3. Componentes

Convención transversal: touch target ≥ **44px**, `focus-visible` en todo lo interactivo, estados `default/hover/active/focus/disabled`. `disabled` se expresa con token (`bg-stone-200` + `text-stone-400`), **no** con `opacity-60`.

Cuando un control debe verse compacto pero cumplir 44px, expandir el área pulsable con un pseudo-elemento (`before:h-11 before:w-11`) en vez de agrandar el botón. Ver `QuickAddButton` y `QuantityStepper`.

### 3.1 `ProductCard`
Superficie sobria: `surface` + borde `border`, `rounded-lg`. Sin tintes alternados — la foto de la verdura ya aporta el color. Foto cuadrada sobre `accent-subtle`, nombre a 2 líneas (`label`), precio (`label`, tabular) y control de cantidad en la misma fila. La primera fila del catálogo pasa `priority` para que el LCP no quede diferido.

### 3.2 `QuickAddButton`
Es un `+` naranja que **se convierte en stepper** (− / cantidad / +) en cuanto el producto está en el carrito. La cantidad se lee del carrito, así la grilla funciona como resumen de lo que llevas.

### 3.3 `SubHeader`
Barra móvil de toda pantalla bajo la home: back + título centrado + acción opcional. Es la única implementación; antes estaba copiada en 9 archivos, todas con el título 4px descentrado porque el espaciador era `h-10` contra un botón `h-11`. Aporta el `h1` de la ruta.

### 3.4 `WalletBadge`
Saldo real (verde no: **naranja**, es dinero) en el header móvil y en el `TopNav`. La racha solo se dibuja si es mayor que cero. Enlaza al ledger. Sustituyó a una campana que tenía el punto de no-leído siempre encendido y ningún destino.

### 3.5 `ProductThumb`
**Único** tratamiento de "sin imagen" en la app: `next/image` cuando hay `imageUrl`, y si no, un degradado determinista por `id` con el glifo de hoja. Carrito y pedidos lo usan también, para que la misma condición no se vea distinta en tres sitios.

### 3.6 `BottomNav`
Cuatro destinos **reales**: Inicio · Carrito · Mi saldo · Invita y gana. Nada de pestañas muertas.

### 3.7 Buscador
`SearchBar` escribe en `SearchProvider` (contexto) y `CatalogBrowser` lo lee: el catálogo completo ya está en el cliente, así que filtra al instante. El buscador del `TopNav` es **opt-in** (`searchable`), porque fuera de la tienda no hay nada que filtrar y un control vivo sin efecto es peor que ninguno.

### 3.8 Iconos
Set outline propio en `components/store/icons.tsx` (grid 24, stroke 1.75, caps redondos), una sola familia. **Sin emojis como iconos**: renderizan distinto por sistema operativo y no se pueden tokenizar.

---

## 4. Anti-slop

- **Un solo acento de acción** en toda la página. Nada de un CTA violeta aquí y uno rosa allá (así estaba: el 404 de pedido era violeta y el de producto rosa).
- **Sin datos inventados.** Prohibido "4.8 (12k)", "15-20 min", saldos por defecto. Si falla la carga, no se dibuja.
- **Sin controles muertos** que parezcan vivos: si un input o botón no hace nada, se quita.
- **Un solo lenguaje de forma:** píldoras para lo interactivo, `rounded-lg` para cards.
- **Sin em-dash** en texto visible. Guion normal.
- Sin texto en degradado, sin glass, sin sombras negras puras (las sombras se tiñen del neutro tibio).

---

## 5. Fuera de alcance (anotado, no hecho)

- **i18n.** `CLAUDE.md` lo exige desde el día uno (`es`/`en`, rutas `[locale]`, copy en diccionarios). Hoy el copy está hardcodeado en español. Es la deuda más grande de esta capa.
- **`loading.tsx` / `error.tsx`.** No existe ninguno; toda navegación bloquea sin feedback.
- **Error-como-vacío.** ~18 sitios convierten un fallo de backend en un estado vacío benigno. El peor: `app/billetera/page.tsx` inventa un saldo de $0.00 si el wallet no carga.
- **Bloque de recompra en un tap.** Requiere una consulta de pedidos por cliente que el puerto `OrderRepository` no expone (solo `findAll` para el operador).
- **Capa Venezuela.** `modules/pricing` (BCV), `payment-method` (`pago_movil`, `zelle`) y `business-profile` ("Banco de Venezuela") siguen siendo de otro mercado. Se quitó su presentación, no el dominio.

---

## 6. Verificación

1. `npx tsc --noEmit` y `npm run build` sin errores.
2. **Sin restos del pivote:** `grep -riE "postres|dessert|recipe|premium|suscrip|por encargo|bcv|bolívar" app components` vacío en la ruta de cliente.
3. **Un solo acento:** `grep -rn "violet\|--color-cta\|brand-[0-9]\|sugar-" app components` vacío.
4. **Contraste:** `node scripts/check-contrast.mjs` — todos los pares ≥ 4.5.
5. **Densidad:** en 390px se ven ≥6 productos y se agrega sin abrir la ficha.
6. **Teclado:** home → ficha → carrito → checkout solo con Tab, con anillo visible en cada control.
7. **`prefers-reduced-motion: reduce`:** sin transiciones, sin `scale` al pulsar, sin `animate-pulse`.
8. **PWA viva:** `/manifest.webmanifest` y `/sw.js` accesibles, instalable, shell offline. Subir `CACHE_VERSION` ante cualquier cambio.
