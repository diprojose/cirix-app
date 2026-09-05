# DESIGN.md - Sistema de diseño white-label

> Fuente de verdad visual para toda la aplicación. El panel conserva la identidad corporativa; el storefront consume una identidad semántica que puede cambiar por cliente sin duplicar componentes.

## Paleta base del storefront

- Verde principal: #164E3D
- Lima secundario: #D8F35F
- Coral de acción: #FF6636
- Fondo cálido: #F6F7F2
- Superficie: #FFFFFF
- Texto: #10231C

Los componentes consumen únicamente tokens semánticos: `bg`, `surface`, `border`, `text`, `text-muted`, `accent`, `action`, `danger` y sus variantes. `app/globals.css` mantiene el shell Cirix; `RouteTheme` aplica el preset comercial a las rutas de loyalty y `BrandTheme` lo sobrescribe por cliente en `/demo/[brandSlug]`. Los tonos `*-strong` usados como texto están separados de `*-fill-strong`, usados como fondos interactivos, para mantener contraste con cualquier paleta admitida.

## Tipografía

- Outfit: títulos, encabezados, números destacados y elementos de campaña.
- Inter: cuerpo, navegación, formularios y datos.
- Las fuentes se cargan con `next/font/google` desde `app/layout.tsx` y se exponen como `--font-outfit` y `--font-inter`.

## Forma y espaciado

- Escala de espacio: 4, 8, 16, 24, 32, 48, 64 y 96 px.
- Radios: 8 px para controles pequeños, 12 px para inputs y thumbnails, 16 px para cards y 20 px para paneles destacados.
- Píldoras para controles compactos y badges.
- Sombras teñidas de navy, nunca negro puro.
- Gradientes oficiales: rojo-naranja, navy-azul, azul-rojo y blanco-naranja.

## Accesibilidad y motion

- Todo control interactivo debe tener un área táctil mínima de 44 px.
- Todo control debe mostrar `focus-visible`.
- El rojo Cirix es el focus ring del shell; cada storefront usa su color accesible de marca.
- Se respeta `prefers-reduced-motion` globalmente.
- Validar contraste WCAG AA para texto, botones, links y estados.

## Mantenimiento

Para cambiar Cirix, modificar la capa semántica raíz de `app/globals.css`. Para una tienda, editar su `BrandProfile`: el motor deriva automáticamente texto, superficies, estados y tonos de interacción. No introducir colores de cliente directamente en componentes compartidos.

Validaciones mínimas:

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `node scripts/check-contrast.mjs`
- Buscar residuos de paletas no aprobadas con una búsqueda de clases de paleta no aprobadas.
