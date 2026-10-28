# Multi-negocio, clientes y roles

Un solo sistema para varios negocios (supermercados, restaurantes). Cada negocio y cada cliente inicia sesión y ve únicamente su información. Esta guía describe cómo está construido, cómo operarlo y cómo extenderlo sin romper el aislamiento.

## Conceptos

| Concepto | Qué es |
| --- | --- |
| **Negocio** (`businesses`) | Un cliente de Cirix. Tiene `slug` (su dirección pública `/b/<slug>`), nombre, tipo (`supermarket`, `restaurant`, `other`) y estado (`active`, `suspended`). |
| **Membresía** (`business_members`) | Una persona con un rol en un negocio: `owner` o `staff`. |
| **Cliente** (`businesses/{id}/customers/{uid}`) | El registro CRM de una persona dentro de un negocio. La misma persona es un cliente distinto en cada negocio. |
| **Evento** (`.../customers/{uid}/events/{id}`) | Una entrada inmutable en la línea de tiempo del cliente (`registered`, `note`; las fases siguientes agregan sellos, puntos, encuestas). |
| **Sesión `member`** | Cualquier cuenta verificada (Google o enlace al correo). Prueba quién eres; **no** da acceso a nada por sí sola. |

Una persona puede ser a la vez dueña de un negocio y clienta de otro. Tener un rol en un negocio no da acceso a los datos de otro.

## Permisos

| Rol | Ver clientes | Validar visitas | Configurar sellos | Gestionar equipo |
| --- | --- | --- | --- | --- |
| `owner` | Sí | Sí | Sí | Sí |
| `staff` | **No** | Sí | No | No |
| Administrador de Cirix (claim `operator`) | Sí, en cualquier negocio | Sí | Sí | Sí |
| Cliente sin rol | No | No | No | No |

El personal no ve la lista de clientes a propósito: solo valida visitas, así que los datos personales quedan con el dueño.

## Cómo se garantiza el aislamiento

1. **El negocio sale del slug, la persona de la sesión.** `ResolveBusinessAccess` recibe el slug de la URL y el `userId` de la sesión verificada. Ningún handler acepta `businessId`, `userId` ni `email` del cuerpo de la petición; si llegan, se ignoran (hay una prueba de punta a punta que lo demuestra).
2. **Una sola puerta.** Páginas: `requireBusinessAccess(slug, permiso?)`. APIs: `checkBusinessApiAccess(slug, permiso?)`. Ambas están en `lib/auth/business-access.ts`.
3. **Datos por subcolección.** Los clientes y sus eventos cuelgan de `businesses/{id}`; los repositorios exigen el `businessId` en cada método, de modo que no existe una consulta "todos los clientes".
4. **El layout protege todo lo anidado.** `app/biz/[slug]/layout.tsx` exige membresía para cualquier página debajo de `/biz/<slug>`.
5. **Sin acceso directo desde el navegador.** Firestore se usa solo con el Admin SDK; las reglas del proyecto deben denegar todo a clientes.
6. **Sin server actions en estas áreas.** El proxy las mantiene privadas; las escrituras van por `/api/member/*`, con comprobación de origen, validación con Zod y límite de tamaño.

Hay **dos barreras** que deben coincidir: `proxy.ts` y el layout raíz. Ambas dependen de `lib/auth/route-access.ts` (`isMemberPage`, `isMemberApi`, `requiresPlatformAccess`).

## Rutas

| Ruta | Quién | Qué hace |
| --- | --- | --- |
| `/b/<slug>?source=table_qr` | Cuenta verificada | Registro como cliente (la abre el QR del negocio). Si no hay sesión, pasa por el login y vuelve. |
| `/me` | Cuenta verificada | Mis programas (negocios donde soy cliente) y mis negocios (donde tengo rol). |
| `/biz/<slug>` | Miembro del negocio | Panel del negocio. El dueño ve la lista de clientes; el personal, un aviso. |
| `POST /api/member/businesses/<slug>/join` | Cuenta verificada | Registra al cliente. Idempotente: `201` si lo crea, `200` si ya existía. |
| `GET /api/member/me/cards` | Cuenta verificada | Negocios donde soy cliente. Siempre de la propia sesión. |
| `GET /api/member/biz/<slug>/customers` | `customers:read` | Clientes del negocio, más recientes primero (`limit`, `before`). |
| `/biz/<slug>/team` | `members:manage` | El equipo: agregar personas por correo y quitarlas. |
| `GET` / `POST` / `DELETE /api/member/biz/<slug>/team` | `members:manage` | Lista el equipo; `{ email, role }` da o cambia un rol; `{ userId }` lo quita. |

## Equipo

El dueño administra su personal desde `/biz/<slug>/team` (enlace "Equipo" en el panel):

- **Agregar:** escribe el correo con el que la persona va a entrar (Google o enlace). Si esa cuenta aún no existe, se reserva una sin contraseña; la persona la reclama al iniciar sesión con ese correo, y nadie más puede hacerlo. Repetir el alta con el mismo rol no cambia nada.
- **Quitar:** la persona pierde el acceso en su siguiente petición, porque la membresía se consulta en cada una.
- **Quién puede qué:** el dueño agrega y quita **personal**. Crear, degradar o quitar **dueños** queda para los administradores de Cirix (en el panel o con el script), para que un socio o un empleado ascendido por error no pueda dejar fuera al dueño. Nunca se puede dejar un negocio sin dueño. Un equipo tiene como máximo 50 personas.
- Cada cambio queda en `audit_log` (`tenancy.member_granted`, `tenancy.member_removed`) con quién lo hizo y el rol anterior.

Errores (`error.code`): `tenancy/team-change-denied` (403), `tenancy/last-owner` (409), `tenancy/team-full` (409), `tenancy/account-disabled` (409), `tenancy/member-not-found` (404), `tenancy/invalid-membership` (400).

## Operación

Aún no hay interfaz para crear negocios ni nombrar dueños; se hace con un script de administrador (escribe en el Firebase de `.env.local`):

```bash
# Crear un negocio y su dueño (la cuenta se reconoce al iniciar sesión con ese correo)
node scripts/manage-business.mjs create --name "Cafe Luna" --slug cafe-luna --kind restaurant --owner dueno@correo.com --confirm

# Añadir o cambiar el rol de una persona (repetir con otro rol lo reemplaza)
node scripts/manage-business.mjs add-member --slug cafe-luna --email persona@correo.com --role staff --confirm

node scripts/manage-business.mjs list
```

La dirección pública del negocio es `/b/<slug>`. El QR de mesa no se arma a mano: el dueño lo imprime desde `/biz/<slug>/qr` (ver [tarjeta de sellos](stamp-card.md#sello-con-el-qr-de-mesa)). El `slug` tiene 3 a 40 caracteres (minúsculas, dígitos y guiones sueltos) y no puede ser una palabra reservada (`admin`, `api`, `login`…). Es único y se reserva de forma atómica.

## Cómo probarlo

- **Pruebas rápidas** (sin red): `npm test`. Cubren dominio, casos de uso, proxy y reglas de ruta.
- **Contra Firestore real:** `FIRESTORE_INTEGRATION=1 npx vitest run test/firestore-tenancy-crm.integration.test.ts`. Prueba lo que los fakes no pueden: la transacción que reserva el slug (gana solo uno de varios simultáneos), el alta de cliente "solo si no existe", la idempotencia de eventos y el orden sin índices compuestos. Escribe datos con prefijo `itest-` y los borra.
- **A mano:** abre `/es/b/<slug>?source=table_qr` en el navegador, inicia sesión, completa el formulario y revisa `/es/me`. Con la cuenta dueña, abre `/es/biz/<slug>`.

## Cómo extender sin romper el aislamiento

- Todo dato nuevo de un negocio cuelga de `businesses/{id}/...` y su repositorio recibe `businessId` en cada método.
- Una página nueva bajo `/biz/<slug>` hereda la membresía del layout, pero **debe** comprobar el permiso concreto que necesita (`requireBusinessAccess(slug, "permiso")`). Un permiso nuevo se declara en `member-role.ts` y se asigna por rol ahí mismo.
- El panel tiene su menú en `app/biz/[slug]/layout.tsx` y un estado de carga en `loading.tsx`, para que cambiar de sección sea inmediato. Por eso una página que llama a `notFound()` (rol sin permiso, supermercado) responde **200** con la pantalla de "no encontrado" y `noindex`: así funciona el streaming de Next.js. La protección es que la página no envía datos; nunca dependas del código HTTP para ocultarlos. Quien no es miembro sí recibe 404, porque lo frena el layout.
- Una pestaña nueva del menú se declara en el layout con el mismo permiso que comprueba su página.
- Una API nueva va bajo `/api/member/` y empieza por `checkBusinessApiAccess`. Nunca leas el negocio de otra fuente que no sea el slug de la ruta.
- Para registrar algo en la historia de un cliente usa `RecordCustomerEvent`; si no debe repetirse, pásale un `id` estable. Un tipo de evento nuevo se añade en `customer-event.ts`.
- Si abres una ruta a otro tipo de cuenta, actualiza `requiresPlatformAccess` y sus pruebas, no solo el proxy.

## Límites conocidos

- No hay interfaz para crear negocios ni cambiar dueños; se usa el script. El personal sí se administra desde el panel.
- La lista de clientes muestra los 50 más recientes (la API pagina con `before`; la página aún no).
- El teléfono es un dato de contacto sin verificar. La identidad la prueba el correo verificado.
- Las políticas TTL y los índices compuestos de otras colecciones requieren plan de pago de Firebase; este módulo no los necesita.
