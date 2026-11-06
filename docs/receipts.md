# Escaneo de recibos

El cliente le toma una foto a su recibo y gana sin pasar por caja: **un sello** en un restaurante, **puntos según el total** en un supermercado. Se lee con OCR gratuito (Tesseract) en nuestro propio servidor, sin servicios de pago. Está **apagado por defecto**; el dueño lo activa en `/biz/<slug>/receipts`.

## Cómo funciona

1. **El cliente toca "Escanear mi recibo"** en su tarjeta (`/me/cards/<slug>`) o en sus puntos (`/me/points/<slug>`). Se abre la cámara del teléfono; en un computador, el selector de archivos.
2. **El navegador reduce la foto** (lado mayor de 2400 px, JPEG) y la envía a `POST /api/member/businesses/<slug>/receipts`. No envía nada más.
3. **Antes de leer**, el servidor comprueba lo que rechazaría el premio de todos modos: módulo activo, que sea cliente del negocio, espera entre sellos o límite diario, y el tope de intentos.
4. **El servidor lee la foto:** corrige la rotación, la lleva a 1200 px de ancho, a gris y con contraste normalizado, y aplica Tesseract.
5. **`parseReceipt`** saca del texto el total, las fechas, la hora, el número de transacción, la autorización y el Merchant ID. Tolera errores típicos del OCR ("Merchant 10", "T0TAL", "©" como separador).
6. **`verifyReceipt`** decide si cuenta: que sea de este negocio, que la fecha esté en la ventana y que el total no pase el tope.
7. **Se reserva el recibo** de forma atómica y se da el premio. Si el premio no se puede dar, la reserva se deshace y el recibo sigue libre.

El total y los identificadores **siempre salen de la foto en el servidor**. Si el navegador mandara esos datos, cualquiera podría inventarse un recibo. Por eso el OCR no corre en el teléfono.

## Configuración del dueño

| Ajuste | Por defecto | Notas |
| --- | --- | --- |
| Activo | No | |
| Cómo aparece el negocio en el recibo | El nombre del negocio | Hasta 5, uno por línea. Si el nombre es un logo que el OCR no puede leer, usar la dirección. |
| Merchant ID | Vacío | La prueba más fiable. Si está configurado y el recibo trae otro, se rechaza aunque el nombre coincida. |
| Antigüedad máxima | 2 días | De 1 a 30. |
| Monto máximo | 500 dólares | Por encima se rechaza, sea un error de lectura o una falsificación. |
| Puntos por dólar (supermercado) | 2 | Entero, de 1 a 100. Las fracciones de punto se redondean hacia abajo. |
| Recibos por cliente al día (supermercado) | 3 | En restaurantes manda la espera entre sellos del programa. |

## Reglas antifraude

| Amenaza | Cómo se frena |
| --- | --- |
| Usar el mismo recibo dos veces, también otra persona | Cada identificador del recibo genera una clave en `receipt_keys`, común a todos los clientes del negocio. Se crean en un solo lote atómico: si alguna existe, nada se escribe. |
| Dos personas envían el mismo recibo a la vez | El lote atómico deja ganar a una sola. |
| Otra foto del mismo recibo, leída distinto | Hay una clave por identificador (transacción y autorización): basta que coincida una. Los caracteres que el OCR confunde (O/0, I/1, S/5…) se unifican. |
| Recibo de otro negocio | Se exige el nombre o el Merchant ID. El nombre tolera un 20 % de letras mal leídas, salvo en nombres de menos de 5 letras, que deben coincidir exactos. |
| Recibos viejos guardados | Ventana de fechas. `11/01/26` se prueba como mes/día y día/mes, y vale la lectura dentro de la ventana. |
| Un error del OCR en el total regala puntos | Tope de monto, y entre totales distintos gana el más repetido. |
| Muchos recibos en poco tiempo | Límite diario en supermercados y espera entre sellos en restaurantes, dentro de la misma transacción que el premio. |
| Abusar de la lectura, que gasta CPU | 15 intentos por persona y día, y fotos de hasta 4 MB y 50 megapíxeles. |

Un sello de recibo y uno del QR de mesa en la misma visita no se suman: comparten la espera de la tarjeta. Cada sello guarda `source: "receipt"`, y el reporte de actividad los cuenta aparte.

### Lo que este modo no puede evitar

- **Recibos ajenos reales.** Un recibo recogido del piso, o el de un amigo que no lo escaneó, vale una vez. Quien llegue primero se queda con él.
- **Recibos falsificados.** Quien edite una imagen con un número nuevo puede pasar la lectura, porque nada confirma el recibo contra la caja del negocio. Eso solo se resuelve conectándose al punto de venta. El tope de monto y el límite diario acotan el daño, y `/biz/<slug>/receipts` lista los recibos aceptados para revisarlos.
- **Fotos muy malas.** El OCR gratuito falla con recibos muy arrugados, borrosos, muy inclinados o de lado. El cliente recibe un mensaje que dice qué no se pudo leer y le pide otra foto.

## Qué se guarda

De un recibo usado se guarda el total, la fecha, el número de transacción, el Merchant ID, el premio y el momento. **No se guardan** la foto, el texto leído, la lista de productos ni nada de la tarjeta: el analizador nunca lee el número de tarjeta.

```
businesses/{businessId}/settings/receipts                        reglas del dueño
businesses/{businessId}/receipts/{receiptId}                     un registro por recibo usado
businesses/{businessId}/receipt_keys/{sha256}                    identificadores ya usados
businesses/{businessId}/customers/{userId}/programs/points       saldo de puntos
businesses/{businessId}/customers/{userId}/programs/receipt_use  intentos del día
businesses/{businessId}/customers/{userId}/points_ledger/{id}    un registro inmutable por movimiento
```

Todo se lee con índices automáticos de un solo campo; no hace falta ningún índice compuesto ni facturación.

## Cambiar de lector

El lector está detrás del puerto `ReceiptReader`: recibe la imagen y devuelve texto. Para pasar a un servicio de IA con visión, basta otra implementación de ese puerto en `modules/receipts/infrastructure/` y cambiarla en `receipts-container.ts`.

## Despliegue

Tesseract corre en un hilo aparte que carga sus archivos del disco, así que no se puede empaquetar:

- `serverExternalPackages` en `next.config.ts` deja fuera del bundle a `tesseract.js`, `tesseract.js-core` y `sharp`.
- `outputFileTracingIncludes` lleva al servidor el WebAssembly y los datos del idioma (`@tesseract.js-data/eng`). Si se cambia la ruta de la API o se actualiza `tesseract.js`, hay que revisar esa lista.
- Los datos del idioma viajan con la app: leer un recibo no depende de ningún servicio externo.
- La ruta tiene `maxDuration = 60`, porque la primera lectura en un servidor frío también carga el motor.

Por ahora solo se usa el idioma inglés, que lee bien cifras y etiquetas de recibos en español. El total se muestra siempre en dólares.

## Pendiente

- **Catálogo de premios y canje de puntos.** Hoy los puntos se acumulan y se ven; todavía no se gastan.
- **Anular un recibo** desde el panel, si el dueño detecta uno falso.
- **Probar con más fotos reales de teléfono.** Se probó con un recibo real y con versiones degradadas por software, no con una muestra amplia.
