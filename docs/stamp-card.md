# Tarjeta de sellos (restaurantes)

Programa de visitas para restaurantes, cafeterías y negocios que no sean supermercados (estos acumulan puntos, no sellos). El cliente junta sellos en una tarjeta digital; al completarla gana un premio, el personal lo entrega y la tarjeta vuelve a empezar. Se apoya en [multi-negocio](tenancy.md) y escribe en la línea de tiempo del [CRM](tenancy.md#conceptos).

## Cómo funciona

1. **El cliente se registra** escaneando el QR de la mesa (`/b/<slug>?source=table_qr`) y cae en su tarjeta (`/me/cards/<slug>`).
2. **En cada visita** muestra su **QR personal**. Es un código firmado por el servidor que cambia solo cada minuto y medio.
3. **El personal lo escanea** en `/biz/<slug>/scan`. Primero ve quién es y qué puede hacer; después confirma **Añadir sello** o **Canjear premio**. Nada cambia hasta confirmar.
4. **El cliente ve el sello aparecer** en su pantalla, con animación, en pocos segundos (la tarjeta abierta consulta cada 5 s).
5. **Al completar la tarjeta** se muestra una celebración y un aviso de "Premio listo". Mientras el premio espera, no se añaden más sellos.
6. **Al canjear**, la tarjeta vuelve a cero y el siguiente ciclo comienza en la próxima visita.

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

Los cambios aplican a los sellos siguientes. Una tarjeta en curso conserva lo que juntó; si el dueño baja la meta por debajo de los sellos ya juntados, esa tarjeta cuenta como completa.

## Rutas

| Ruta | Quién | Qué hace |
| --- | --- | --- |
| `/me/cards/<slug>` | El cliente | Su tarjeta, el premio, el QR y las animaciones. |
| `/biz/<slug>/scan` | Dueño y personal (`visits:record`) | Pantalla de mostrador: cámara, confirmación, entrada manual. |
| `/biz/<slug>/program` | Dueño (`program:manage`) | Reglas del programa. |
| `GET /api/member/businesses/<slug>/card` | El cliente | Su tarjeta (para el refresco automático). |
| `GET /api/member/businesses/<slug>/qr` | El cliente | Un código nuevo para su QR. |
| `POST /api/member/biz/<slug>/scan/preview` | `visits:record` | Muestra primer nombre y estado; no cambia nada. |
| `POST /api/member/biz/<slug>/scan/stamp` | `visits:record` | Añade un sello. |
| `POST /api/member/biz/<slug>/scan/redeem` | `visits:record` | Entrega el premio y reinicia la tarjeta. |
| `GET` / `PUT /api/member/biz/<slug>/program` | `program:manage` | Lee o cambia las reglas. |

Un supermercado responde **404** a todas, como si la función no existiera.

Errores de escaneo (`error.code`): `stamps/invalid-token`, `stamps/expired-token`, `stamps/not-a-customer` (404), `stamps/too-soon` (409, con `retryAfterSeconds`), `stamps/reward-pending` (409), `stamps/no-reward` (409), `stamps/inactive` (409).

## Datos

Todo cuelga del cliente dentro de su negocio, sin índices compuestos:

```
businesses/{businessId}/customers/{userId}/programs/stamps       la tarjeta (estado actual)
businesses/{businessId}/customers/{userId}/stamps/{stampId}      un registro inmutable por sello (empleado, fecha, número)
businesses/{businessId}/customers/{userId}/redemptions/{id}      un registro inmutable por premio entregado
businesses/{businessId}/settings/stamp_program                   las reglas del negocio
```

La tarjeta se cambia **solo** dentro de una transacción (`StampCardRepository.transact`): se lee, se decide con lógica pura del dominio y se guarda todo junto. Cada sello y canje también se anota en la línea de tiempo del CRM (`stamp_added`, `reward_unlocked`, `reward_redeemed`) con un id estable; si esa anotación falla, el sello se conserva (la tarjeta es la fuente de verdad).

## Cómo probarlo

- **Rápidas** (`npm test`): la máquina de estados, el firmador, los casos de uso con concurrencia y que el código **se pueda leer como QR** con la librería de escaneo.
- **Contra Firestore real:** `FIRESTORE_INTEGRATION=1 npx vitest run test/firestore-stamp-card.integration.test.ts`. Demuestra que 8 escaneos simultáneos suman un solo sello y que 5 canjes simultáneos entregan un solo premio.
- **A mano:** crea un negocio `restaurant` con `scripts/manage-business.mjs`, regístrate por `/b/<slug>`, añade a otra cuenta como `staff` y escanea desde el celular. La cámara necesita HTTPS (o `localhost`); sin ella, usa "Ingresar código a mano".

## Límites conocidos

- **La cámara no se probó en un teléfono.** El lector usa el detector nativo (Chrome en Android) o `jsqr` (Safari en iPhone). Hay que validarlo en dispositivos reales antes de un piloto.
- **Un empleado deshonesto puede sellar sin compra.** El diseño lo hace visible (cada sello nombra al empleado) pero aún no hay un reporte ni alertas de patrones por empleado.
- **No hay pase para Apple Wallet ni Google Wallet.** La tarjeta es una página web (PWA). Los pases requieren cuentas de desarrollador (Apple es de pago).
- **El refresco de la tarjeta es por consulta cada 5 s**, no en tiempo real; con el límite diario gratuito de Firestore conviene vigilar el consumo si hay muchos clientes con la tarjeta abierta.
- La lista de clientes del panel aún no muestra el progreso de sellos de cada uno.
