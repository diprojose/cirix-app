# Tarjeta de sellos (restaurantes)

Programa de visitas para restaurantes, cafeterías y negocios que no sean supermercados (estos acumulan puntos, no sellos). El cliente junta sellos en una tarjeta digital; al completarla gana un premio, el personal lo entrega y la tarjeta vuelve a empezar. Se apoya en [multi-negocio](tenancy.md) y escribe en la línea de tiempo del [CRM](tenancy.md#conceptos).

## Cómo funciona

1. **El cliente se registra** escaneando el QR de la mesa (`/b/<slug>?source=table_qr`) y cae en su tarjeta (`/me/cards/<slug>`).
2. **En cada visita** muestra su **QR personal**. Es un código firmado por el servidor que cambia solo cada minuto y medio.
3. **El personal lo escanea** en `/biz/<slug>/scan`. Primero ve quién es y qué puede hacer; después confirma **Añadir sello** o **Canjear premio**. Nada cambia hasta confirmar.
4. **El cliente ve el sello aparecer** en su pantalla, con animación, en pocos segundos (la tarjeta abierta consulta cada 5 s).
5. **Al completar la tarjeta** se muestra una celebración y un aviso de "Premio listo". Mientras el premio espera, no se añaden más sellos.
6. **Al canjear**, la tarjeta vuelve a cero y el siguiente ciclo comienza en la próxima visita.

## Sello con el QR de mesa

El cliente pidió que el comensal pueda sellar su visita escaneando el QR impreso en la mesa, sin pasar por caja. Es opcional y está **apagado por defecto**; el dueño lo activa en `/biz/<slug>/program`.

1. **El dueño imprime el QR** en `/biz/<slug>/qr` (o descarga la imagen). El QR lleva a `/b/<slug>?source=table_qr&t=<código>`.
2. **La primera vez**, quien lo escanea inicia sesión, se registra y cae en su tarjeta con el código.
3. **Las siguientes veces** va directo a su tarjeta.
4. La tarjeta muestra **"Sumar el sello de esta visita"**. El sello se da al tocar el botón, nunca al abrir la página, y el código se borra de la barra de direcciones.
5. **El premio se canjea como siempre**: el personal escanea el QR personal del cliente. Esa entrega presencial es el límite real del abuso.

Con el modo apagado, el mismo QR sirve solo para registrarse, y los sellos los da el personal.

### Lo que este modo no puede evitar

Un QR impreso no cambia, así que **una foto suya sirve desde cualquier lugar**: alguien puede sumar sellos desde su casa o compartir la foto. Ninguna regla del servidor distingue a quien está sentado en la mesa de quien tiene la foto. El cliente conoce y acepta este riesgo. Las defensas lo acotan, no lo eliminan:

| Defensa | Efecto |
| --- | --- |
| Espera mínima de **60 min** con este modo (en vez de 5) | Una foto suma como máximo un sello por hora y por persona. Cuatro horas (240 min) es lo recomendado. |
| La espera es la misma para los dos caminos | Un sello de mesa y uno del personal en la misma visita no se suman: el segundo se rechaza. |
| **Cambiar código** en `/biz/<slug>/qr` | Los QR impresos con el código anterior dejan de sellar al instante (siguen sirviendo para registrarse). Hay que reimprimirlos. |
| Cada sello guarda su origen | `source: "table_qr"` y `staffUserId: null`, frente a `"staff"` con el empleado. Permite ver luego qué parte de los sellos vino de la mesa. |
| Canje presencial | Juntar sellos desde casa no sirve de nada sin ir al local a canjear. |
| Interruptor del dueño | Si hay abuso, se apaga y todo vuelve a pasar por el personal. |

El código de mesa son 16 caracteres aleatorios (96 bits) guardados en Firestore, independientes de `STAMP_QR_SECRET`: rotar ese secreto no invalida los QR impresos.

## Reglas antifraude

| Amenaza | Cómo se frena |
| --- | --- |
| Captura de pantalla del QR usada después | El código vence a los 90 s y se renueva solo; una captura deja de servir enseguida. |
| El mismo código escaneado dos veces, o dos empleados a la vez | La **espera entre sellos** (mínimo 5 min, por defecto 4 h) se comprueba dentro de una transacción atómica: solo uno de los intentos suma. |
| Falsificar un código | Va firmado con HMAC-SHA256 y un secreto del servidor; cualquier cambio lo invalida. |
| Un código de un negocio usado en otro | El código nombra a su negocio; en otro se rechaza igual que uno falso. |
| Entregar dos premios por una tarjeta | El canje exige un premio pendiente y es atómico; un doble toque entrega uno solo. |
| Un empleado que sella sin compra | Cada sello y canje queda como registro inmutable con el empleado que lo dio. Hay que revisar patrones; ver límites. |
| Que el personal vea datos de clientes | Solo ve el **primer nombre** de quien escanea. La lista de clientes es del dueño. |

La espera mínima (5 min) es siempre mayor que la vida del código (90 s). Eso es lo que hace imposible sumar un segundo sello con una captura o un doble escaneo.

## Configuración

Variable de entorno obligatoria para esta función: **`STAMP_QR_SECRET`**, al menos 32 caracteres aleatorios, solo en el servidor y distinta en cada entorno. Sin ella, las rutas de sellos responden `503` y la app se niega a firmar códigos con un secreto débil.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Rotarla invalida los códigos en circulación**, que de todos modos duran 90 segundos; no afecta a las tarjetas guardadas.

El dueño ajusta las reglas en `/biz/<slug>/program`:

| Campo | Rango | Por defecto |
| --- | --- | --- |
| Sellos para ganar el premio | 3 a 30 | 10 |
| Premio | 2 a 60 caracteres | "Free item" |
| Espera entre sellos | 5 a 1440 min | 240 |
| Programa activo | sí / no | sí |
| El cliente sella con el QR de la mesa | sí / no (con "sí", la espera mínima es 60 min) | no |

Los cambios aplican a los sellos siguientes. Una tarjeta en curso conserva lo que juntó; si el dueño baja la meta por debajo de los sellos ya juntados, esa tarjeta cuenta como completa.

## Rutas

| Ruta | Quién | Qué hace |
| --- | --- | --- |
| `/me/cards/<slug>` | El cliente | Su tarjeta, el premio, el QR y las animaciones. |
| `/biz/<slug>/scan` | Dueño y personal (`visits:record`) | Pantalla de mostrador: cámara, confirmación, entrada manual. |
| `/biz/<slug>/program` | Dueño (`program:manage`) | Reglas del programa. |
| `/biz/<slug>/qr` | Dueño (`program:manage`) | QR de mesa para imprimir o descargar, y botón para cambiar su código. |
| `/biz/<slug>/activity?days=30` | Dueño (`customers:read`) | Periodo de 7, 30 (por defecto) o 90 días. Sellos y premios por empleado, personal frente a QR de mesa, y los clientes que más sellan con el QR de mesa. |
| `POST /api/member/businesses/<slug>/table-stamp` | El cliente | `{ code }`: sella su propia tarjeta con el código de la mesa. |
| `POST /api/member/biz/<slug>/table-code` | `program:manage` | Emite un código de mesa nuevo. |
| `GET /api/member/businesses/<slug>/card` | El cliente | Su tarjeta (para el refresco automático). |
| `GET /api/member/businesses/<slug>/qr` | El cliente | Un código nuevo para su QR. |
| `POST /api/member/biz/<slug>/scan/preview` | `visits:record` | Muestra primer nombre y estado; no cambia nada. |
| `POST /api/member/biz/<slug>/scan/stamp` | `visits:record` | Añade un sello. |
| `POST /api/member/biz/<slug>/scan/redeem` | `visits:record` | Entrega el premio y reinicia la tarjeta. |
| `GET` / `PUT /api/member/biz/<slug>/program` | `program:manage` | Lee o cambia las reglas. |

Un supermercado responde **404** a todas, como si la función no existiera.

Errores de escaneo (`error.code`): `stamps/invalid-token`, `stamps/expired-token`, `stamps/not-a-customer` (404), `stamps/too-soon` (409, con `retryAfterSeconds`), `stamps/reward-pending` (409), `stamps/no-reward` (409), `stamps/inactive` (409). Del QR de mesa: `stamps/table-disabled` (409, el dueño no lo activó) y `stamps/invalid-table-code` (400, código equivocado, de otro negocio o reemplazado).

## Datos

Todo cuelga del cliente dentro de su negocio, sin índices compuestos:

```
businesses/{businessId}/customers/{userId}/programs/stamps       la tarjeta (estado actual)
businesses/{businessId}/customers/{userId}/stamps/{stampId}      un registro inmutable por sello (empleado, fecha, número)
businesses/{businessId}/customers/{userId}/redemptions/{id}      un registro inmutable por premio entregado
businesses/{businessId}/settings/stamp_program                   las reglas del negocio
businesses/{businessId}/settings/table_code                      el código del QR de mesa (se crea al abrir /biz/<slug>/qr)
businesses/{businessId}/stamp_activity/{YYYY-MM-DD}              totales de ese día (UTC) para el reporte de actividad
```

Cada registro de sello guarda `source` (`staff` o `table_qr`) y `staffUserId` (nulo en los de mesa). Los programas guardados antes de existir el modo de mesa no tienen `tableStamps` y se leen como apagado.

El reporte de actividad no recorre los sellos uno por uno: cada sello y cada canje suman, **en la misma transacción**, a los totales del día (`staffStamps` y `redemptions` por empleado, `tableStamps` y `tableStampsByCustomer`). Un mes de reporte cuesta unas 30 lecturas, sin importar cuánto se mueva el negocio, y no hace falta ningún índice. Los días van en UTC, así que un sello de noche en América puede caer en el día siguiente; en periodos de 7 a 90 días no cambia la lectura. Los sellos dados antes de existir el reporte no aparecen en él.

La lista de clientes del panel muestra el progreso de cada uno (sellos sobre la meta, premio listo, premios canjeados y último sello) con una sola lectura en lote de las tarjetas de esa página.

La tarjeta se cambia **solo** dentro de una transacción (`StampCardRepository.transact`): se lee, se decide con lógica pura del dominio y se guarda todo junto. Cada sello y canje también se anota en la línea de tiempo del CRM (`stamp_added`, `reward_unlocked`, `reward_redeemed`) con un id estable; si esa anotación falla, el sello se conserva (la tarjeta es la fuente de verdad).

## Cómo probarlo

- **Rápidas** (`npm test`): la máquina de estados, el firmador, los casos de uso con concurrencia y que el código **se pueda leer como QR** con la librería de escaneo.
- **Contra Firestore real:** `FIRESTORE_INTEGRATION=1 npx vitest run test/firestore-stamp-card.integration.test.ts`. Demuestra que 8 escaneos simultáneos suman un solo sello, que 5 canjes simultáneos entregan un solo premio y que los totales diarios no pierden sellos cuando llegan varios a la vez.
- **A mano:** crea un negocio `restaurant` con `scripts/manage-business.mjs`, regístrate por `/b/<slug>`, añade a otra cuenta como personal desde `/biz/<slug>/team` y escanea desde el celular. La cámara necesita HTTPS (o `localhost`); sin ella, usa "Ingresar código a mano".

## Límites conocidos

- **La cámara no se probó en un teléfono.** El lector usa el detector nativo (Chrome en Android) o `jsqr` (Safari en iPhone). Hay que validarlo en dispositivos reales antes de un piloto.
- **Un empleado deshonesto puede sellar sin compra.** El reporte de actividad muestra cuántos sellos dio cada empleado, pero no hay alertas automáticas: el dueño tiene que mirarlo.
- **El sello con QR de mesa se puede usar desde fuera del local** con una foto del QR (ver arriba). El reporte de actividad lista a los 10 clientes que más sellan con el QR de mesa; no marca a nadie como sospechoso por su cuenta.
- **No hay pase para Apple Wallet ni Google Wallet.** La tarjeta es una página web (PWA). Los pases requieren cuentas de desarrollador (Apple es de pago).
- **El refresco de la tarjeta es por consulta cada 5 s**, no en tiempo real; con el límite diario gratuito de Firestore conviene vigilar el consumo si hay muchos clientes con la tarjeta abierta.
