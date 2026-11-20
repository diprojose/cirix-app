# Página de inicio

La página pública (`/es`, `/en`) reproduce el boceto del diseñador (`https://cirixboceto.pages.dev/`). Cuando llegue el Figma, se ajustan los detalles contra él.

## Dónde está cada cosa

| Archivo | Qué contiene |
| --- | --- |
| `app/page.tsx` | La estructura de la página, sección por sección, en el mismo orden del boceto. |
| `components/home/home-content.ts` | Todos los textos, en inglés (idéntico al boceto) y en español. Para cambiar una frase, se cambia solo aquí. |
| `components/home/home.module.css` | El estilo del boceto: colores, tamaños y espacios con sus mismos valores. |
| `components/home/home-interactive.tsx` | Las partes que se mueven: menú del celular, pasos, precio mensual o anual, contadores, aparición al hacer scroll y el formulario de contacto. |
| `components/home/home-icons.tsx` | Los íconos del boceto. |
| `public/brand/home/` | Las imágenes del boceto, copiadas al proyecto para que no dependan de la cuenta del diseñador. |

## Diferencias con el boceto, a propósito

- **Idioma y entrada:** la cabecera agrega el selector ES/EN y "Ingresar", porque el sitio es bilingüe y por ahí entran los dueños y los clientes.
- **Contacto:** el formulario del boceto solo descargaba un archivo. Aquí, al enviarlo se abre WhatsApp (el mismo número de antes) con el mensaje ya escrito; la persona decide si lo envía.
- **Boletín:** no hay a dónde enviar los correos, así que esa columna del pie ofrece escribir por WhatsApp.
- **Términos y condiciones:** no hay página todavía; el pie solo enlaza la política de privacidad (`/privacy`).

## Pendiente con Cirix antes de publicarla

- **Promesas que la app no cumple hoy:** tarjeta en Apple Wallet o Google Wallet, notificaciones automáticas a los 14 días, y las tarjetas de cashback, suscripción y regalo.
- **Marcas ajenas en las imágenes:** las tarjetas de ejemplo (Vallarta, Backyard Burgers, Alcampo, Pingo Doce y otras) y la foto de la portada (publicidad de Nike).
- **Cifras:** el precio (49 € + IVA, 490 € al año) y los resultados (2×, 30 %, 48 horas).
- **Datos de contacto:** Instagram y TikTok apuntan a `@cirix.io`, como en el boceto.
- **Textos en español:** traducción propia, a revisar.
