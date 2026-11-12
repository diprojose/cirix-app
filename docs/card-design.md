# Diseño de la tarjeta

Cada negocio viste su tarjeta con su marca, como en las apps de fidelización de la competencia. El dueño la diseña en `/biz/<slug>/design` (permiso `program:manage`) y ve la tarjeta tal como la verá el cliente mientras elige.

## Qué se personaliza

| Elemento | Opciones | Dónde se ve |
| --- | --- | --- |
| Color | 12 colores sugeridos o cualquier otro (`#rrggbb`) | Toda la tarjeta. El texto pasa solo a blanco o casi negro, el que mejor contraste. |
| Logo | Imagen propia (PNG con fondo transparente es lo ideal) | Arriba a la izquierda de la tarjeta, en "Mis programas" de `/me` y en la página de registro `/b/<slug>`. Sin logo, se escribe el nombre del negocio. |
| Foto de portada | Opcional | Detrás de las visitas en el restaurante (con una sombra para que se lean), o como franja en la tarjeta de puntos. |
| Icono de las visitas | 12 iconos dibujados (estrella, café, hamburguesa, pizza, taco, helado, postre, pan, cóctel, cerveza, corazón, hoja) o una imagen propia | Solo restaurantes. Las visitas ganadas se ven a color; las que faltan, en gris y con borde punteado. |

Sin diseño guardado, la tarjeta es azul Cirix con estrellas.

## El color llega a toda la pantalla

En la tarjeta de visitas (`/me/cards/<slug>`), la de puntos (`/me/points/<slug>`) y el registro (`/b/<slug>`), los botones, enlaces, barras de progreso, bordes de foco y el aviso de "Instalar app" usan el color del negocio, no el azul Cirix. `brandPalette` (en el dominio) calcula los tonos y `<BrandTheme>` los aplica a la pantalla mientras esa página está abierta; al salir, la app vuelve al azul.

- **Los botones** llevan el color exacto, con texto blanco o casi negro según el que se lea mejor. Si el color es tan claro que se confunde con el fondo (crema, beige), los botones y barras usan un tono más oscuro del mismo color (contraste 3:1); la tarjeta conserva el color exacto.
- **Los enlaces y bordes** sobre el fondo claro se oscurecen lo justo para pasar WCAG AA (4,5:1). Así una marca amarilla sigue teniendo enlaces legibles.
- **El panel del negocio** sigue en azul Cirix: es la herramienta del dueño, no la cara de su marca. El editor muestra un botón de ejemplo bajo la vista previa.

## Cómo funciona

1. **El dueño sube una imagen.** El navegador la reduce (PNG para logo e icono, JPEG para la foto) y la envía a `POST /api/member/biz/<slug>/design/images?kind=logo|cover|stamp`.
2. **El servidor la prepara con sharp:** corrige la rotación, quita el margen vacío del logo y del icono, y la convierte a WebP. Logo hasta 480×192, portada recortada a 1080×600, icono 192×192, con transparencia. Si no es una imagen que sharp pueda abrir, se rechaza.
3. **La imagen no se ve hasta guardar.** `PUT /api/member/biz/<slug>/design` guarda el color, el icono y las imágenes elegidas. Cada imagen debe existir, ser de este negocio y ser del tipo correcto. Al guardar se borran las imágenes subidas que no se eligieron.
4. **Los clientes la ven al abrir su tarjeta.** Las imágenes se sirven desde `GET /api/card-images/<businessId>/<imageId>`. Esa ruta es pública, como cualquier marca, porque la página de registro las muestra antes de iniciar sesión, y se guardan en caché un año: una imagen nueva siempre recibe otro id.

## Almacenamiento

Firebase Storage exige el plan de pago, así que las imágenes se guardan dentro de Firestore, ya comprimidas. Un logo pesa unos 15 KB y una portada unos 100 KB, con un tope de 600 KB, lejos del límite de 1 MiB por documento.

```
businesses/{businessId}/settings/card_design      color, logoId, coverId, stamp
businesses/{businessId}/card_images/{imageId}     kind, mime, data (bytes)
```

Un negocio puede tener hasta 12 imágenes sin guardar (`MAX_STORED_IMAGES`). Pasado ese número, hay que guardar el diseño, lo que limpia las que sobran.

## Pendiente

- **Tarjeta en Apple Wallet y Google Wallet.** Google Wallet es gratuito. Apple Wallet exige la cuenta de desarrollador de Apple (99 USD al año).
