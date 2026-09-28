# Acceso con Google en móviles

El login usa `signInWithRedirect` en Android, iPhone y iPad (incluido el modo
escritorio de iPadOS) cuando el origen HTTPS de `authDomain` coincide con el de
la página de login. Si no coincide (por ejemplo, `firebaseapp.com`, localhost o
un preview), abre un popup directamente desde el clic. En escritorio mantiene
el popup y cambia a redirección si el navegador devuelve `auth/popup-blocked`
y el helper está en el mismo origen. Sin esa configuración, muestra un mensaje
para permitir ventanas emergentes y reintentar, evitando una redirección que
puede perder la credencial. Al volver a la misma URL de login,
`getRedirectResult` recupera la credencial y la intercambia en `/api/auth/session`.
Se conservan el idioma, `from`, los parámetros de campaña y la audiencia
`reviews`/`platform`. Firebase se inicializa con persistencia en memoria; después
del intercambio se cierra su sesión y solo se conserva la cookie httpOnly.
La navegación final carga el destino con esa cookie mediante
`window.location.replace`, evitando reutilizar páginas de la sesión anónima o
competir con una recarga de `/login`.

## Configuración necesaria antes de publicar

Safari y otros navegadores bloquean el almacenamiento entre el dominio de la app
y `firebaseapp.com`. Cambiar únicamente popup por redirect no resuelve esto.
El proyecto incluye un proxy transparente de los helpers `/__/auth/*` al proyecto Firebase,
exento de redirecciones de idioma/login, sin caché y con iframe `SAMEORIGIN`.

1. En Firebase Console → Authentication → Settings → Authorized domains, agregar
   el dominio exacto donde se inicia sesión (`www.cirixadv.com` para el dominio
   canónico definido en `lib/site-metadata.ts`).
2. En Google Cloud Console → APIs & Services → Credentials, abrir el cliente OAuth
   web utilizado por el proveedor Google de Firebase. Agregar a **Authorized
   redirect URIs**: `https://www.cirixadv.com/__/auth/handler`.
3. En el entorno de producción, establecer
   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=www.cirixadv.com`, sin protocolo ni ruta.
   Mantener `NEXT_PUBLIC_FIREBASE_PROJECT_ID=mixmag-6496a` y el resto de la
   configuración del mismo proyecto. Reconstruir y desplegar: las variables
   `NEXT_PUBLIC_*` se incluyen durante el build.
4. Si el login se sirve en `cirixadv.com` u otro dominio, usar ese host exacto
   en los pasos anteriores y unificar el dominio de entrada. El host de la página
   de login debe coincidir con `authDomain`; no mezclar dominios entre la ida y
   el regreso. Los previews necesitan su propia configuración antes de probar
   redirecciones. En localhost se puede probar el popup de escritorio con el
   dominio Firebase original.

Estos cambios de consola y entorno no se realizan al modificar el repositorio.

## Google solicita Face ID o una llave de acceso

La pantalla `accounts.google.com` que dice «Use your passkey to confirm it's
really you» es una verificación de la cuenta Google, anterior al regreso a
Firebase. La aplicación no puede omitirla ni forzar a Google a pedir contraseña.
Si el usuario no puede completar esa verificación, puede elegir «Probar otra
manera» / «Try another way» y utilizar una opción disponible para su cuenta.
Esto también aplica al mensaje «Something went wrong» que pide activar
Bluetooth y acercar los dispositivos: corresponde a la verificación de la
llave de acceso y puede aparecer también en Safari. Cambiar el dominio de
Firebase no repara esa verificación de Google.
Si abrió el enlace en un navegador integrado de otra app, debe abrir el mismo
enlace en Safari o Chrome. El login incluye estas instrucciones en una ayuda
desplegable, disponible antes de salir hacia Google.

Referencia: [ayuda de Google sobre llaves de acceso](https://support.google.com/accounts/answer/13548313?hl=es).

## Verificación en producción

- `/__/auth/iframe` debe responder sin redirigir a `/login` ni añadir `/es` o
  `/en`, con `X-Frame-Options: SAMEORIGIN` y `Cache-Control: no-store`.
- Desde Safari en iPhone y Chrome en Android, abrir una invitación de reseña con
  `source` y `ref`, continuar con Google y verificar que vuelve a la reseña con
  los mismos parámetros. Repetir con el acceso autorizado a la plataforma.
- Cancelar el selector de cuenta y volver a intentar; bloquear los popups de
  escritorio para comprobar la alternativa por redirección cuando `authDomain`
  coincide. Si usa `firebaseapp.com`, verificar que el popup bloqueado muestra
  instrucciones y permite reintentar sin enviar al usuario a una redirección.
- Una cuenta sin autorización debe poder acceder a reseñas pero seguir sin
  acceso a los módulos privados. Comprobar que solo queda la cookie de sesión
  httpOnly después del intercambio.
- Algunos navegadores integrados de otras apps no admiten Google OAuth. En ese
  caso, abrir el enlace en Safari o Chrome; una redirección no elude esa
  restricción del proveedor.

Referencias: [redirecciones y proxy de Firebase](https://firebase.google.com/docs/auth/web/redirect-best-practices#option_3_proxy_auth_requests_to_firebaseappcom)
y [persistencia en memoria con redirect](https://firebase.google.com/docs/auth/web/auth-state-persistence).
