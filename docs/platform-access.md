# Acceso controlado a CIRIX

La landing (`/`, `/es`, `/en`) y la solicitud de reseñas (`/review`, `/es/review`, `/en/review`) son páginas públicas. `/login` y sus variantes de idioma son la puerta de autenticación. Las demás demos, módulos, páginas operativas y APIs internas de negocio requieren una sesión verificada de una cuenta habilitada previamente.

`/api/reviews/events` es una excepción pública para telemetría anónima: valida mismo origen, tamaño y un esquema cerrado; no recibe comentarios ni expone lectura de datos. Las acciones de servidor sobre `/review` y las rutas anidadas siguen protegidas.

## Crear o habilitar una cuenta

Usamos Google para verificar la identidad y Firebase Admin para autorizarla. Un inicio de sesión con Google puede generar un registro de identidad en Firebase, pero **no concede acceso a CIRIX**. No basta con que el correo exista ni con agregarlo a `OPERATOR_EMAILS`.

Configura las credenciales Firebase Admin de `.env.example` en `.env.local` y ejecuta desde un entorno administrativo de confianza:

```bash
# Crea la cuenta si falta y habilita el acceso a módulos y demos.
node scripts/manage-platform-user.mjs --email persona@empresa.com --grant --confirm

# Además concede el rol de operador, para administrar datos reales.
node scripts/manage-platform-user.mjs --email operador@empresa.com --grant --operator --confirm

# Retira el acceso y revoca las sesiones existentes.
node scripts/manage-platform-user.mjs --email persona@empresa.com --revoke --confirm
```

Estos comandos escriben en el proyecto Firebase configurado. No envían invitaciones, contraseñas ni correos. La persona debe iniciar sesión usando exactamente la cuenta de Google autorizada. No se marca su correo como verificado manualmente: Google debe verificarlo.

El permiso administrativo es el custom claim `platformAccess: true`. Los operadores existentes con `operator: true` conservan el acceso; `platformAccess: false` lo revoca incluso si tienen ese rol. `OPERATOR_EMAILS` solo determina el rol de una cuenta que ya pasó la verificación de acceso. Una cuenta eliminada, deshabilitada o sin email verificado no puede entrar.

## Fronteras de seguridad

- Proxy verifica la cookie real y la autorización actual; una cookie inventada no permite entrar. La política deniega por defecto, incluidas nuevas rutas y URLs de módulos con extensiones.
- El layout, las APIs de negocio y las acciones de servidor vuelven a verificar el acceso. Los permisos de operador siguen aplicándose donde corresponden.
- La creación de sesión requiere identidad verificada, autorización previa e inicio de sesión reciente. El navegador conserva únicamente la cookie httpOnly del servidor, no una sesión persistente de Firebase.
- El servidor consulta los permisos actuales al verificar la sesión; no confía en los roles antiguos guardados en la cookie.
- HTML, RSC y respuestas de módulos no se guardan en el service worker. La actualización elimina los cachés anteriores.
- Los recursos estáticos necesarios para la landing/login son públicos. Los webhooks de Twilio y el cron conservan su validación por firma o secreto; no usan el login interactivo.
- `/api/contact` es una excepción pública explícita para recibir contactos desde la landing de marketing. Conserva su validación de campos, tamaño, honeypot y CORS. No expone lectura del CRM; las APIs internas del CRM sí requieren una sesión autorizada. El contacto por WhatsApp sigue disponible.

Referencia del proveedor: [custom claims de Firebase](https://firebase.google.com/docs/auth/admin/custom-claims) y [cookies de sesión](https://firebase.google.com/docs/auth/admin/manage-cookies).

## Verificación

```bash
npm test
npm run build
```

Verificar en un proyecto Firebase de prueba: cuenta habilitada, cuenta no habilitada, correo sin verificar, usuario deshabilitado, retiro de acceso con sesión abierta y operador degradado. Las pruebas locales usan un proveedor simulado y no crean usuarios reales.
