# DESIGN.md - Sistema de diseño de Cirix

> Fuente de verdad visual para toda la aplicación. La identidad combina el navy oceánico de Cirix con rojo de acción, azul corporativo, naranja energético, blanco y gris neutro.

## Paleta

- Navy principal: #051934
- Navy profundo: #030E1D
- Azul corporativo: #1C5AAE
- Rojo de marca y acción: #E5002B
- Naranja secundario: #E54700
- Cyan complementario: #08B9E4
- Gris: #A0A1A8
- Blanco: #FFFFFF

Los componentes consumen únicamente tokens semánticos de `app/globals.css`: `bg`, `surface`, `border`, `text`, `text-muted`, `accent`, `action`, `danger` y sus variantes. Los colores directos se reservan para la paleta base o marcas de terceros.

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
- El rojo Cirix es el focus ring global.
- Se respeta `prefers-reduced-motion` globalmente.
- Validar contraste WCAG AA para texto, botones, links y estados.

## Mantenimiento

Para cambiar el tema visual, modificar primero la capa semántica en `app/globals.css`. No crear variables de color locales locales ni introducir clases de paleta de terceros en componentes Cirix.

Validaciones mínimas:

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- `node scripts/check-contrast.mjs`
- Buscar residuos de paletas no aprobadas con una búsqueda de clases de paleta no aprobadas.
