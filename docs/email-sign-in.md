# Acceso con correo verificado

El login ofrece Google y un enlace de acceso enviado al correo. Ambos métodos
deben producir un ID token de Firebase con correo verificado antes de crear la
cookie de sesión. Escribir una dirección o solicitar un enlace no permite
acceder a reseñas ni registra una identidad verificada.

## Recorrido

1. En `/es/login` o `/en/login`, escribir el correo y pulsar **Enviar enlace de
   acceso**. Firebase envía el mensaje con el idioma seleccionado.
2. Abrir el enlace. Vuelve al login con `emailSignIn=1` y el destino `from`,
   conservando campaña, `ref`, `source` e idioma.
3. Confirmar el correo y pulsar **Verificar y continuar**. No se consume el enlace
   al cargar la página: la confirmación explícita evita sesiones involuntarias y
   que un previsualizador consuma el código.
4. Firebase comprueba el correo y el código de un solo uso. El servidor verifica
   el ID token, la vigencia del acceso y el estado del usuario antes de emitir
   la cookie httpOnly. Después se cierra la sesión cliente de Firebase.

El acceso a reseñas acepta una identidad activa con correo verificado. Para los
módulos privados sigue siendo necesaria la habilitación administrativa. El enlace
no agrega permisos, no modifica claims y no marca un correo como verificado desde
el cliente. El correo verificado en CIRIX puede ser diferente al usado después en
Google para publicar una reseña; no se presenta como el correo del autor de Google.

## Configuración de Firebase

Estado comprobado el 28 de septiembre de 2026 en `mixmag-6496a`: acceso por
enlace habilitado y dominios `cirixadv.com` y `www.cirixadv.com` autorizados.
La cuenta de servicio no dispone de permiso para consultar facturación; el plan
y la cuota de envío deben confirmarse en la consola. No se modificó facturación
ni se enviaron correos durante la implementación.

- Authentication → Sign-in method → Email/Password: habilitar el proveedor y
  **Email link (passwordless sign-in)**. En la API de configuración equivale a
  `signIn.email.enabled=true` y `signIn.email.passwordRequired=false`.
- Authorized domains: incluir todos los hosts reales de acceso, particularmente
  `cirixadv.com` y `www.cirixadv.com`. Un preview o localhost necesita autorización
  específica para sus propias pruebas.
- Authentication → Templates: revisar el nombre del remitente y la plantilla de
  acceso por correo. Esta implementación usa el envío de Firebase; no necesita
  claves SMTP ni Resend. No configurar el handler OAuth `/__/auth/handler` como
  manejador de acciones de correo: son recorridos diferentes.
- Mantener una cuenta por dirección de correo (`allowDuplicateEmails=false`).
- Revisar las cuotas antes de campañas: al implementar, la documentación indica
  **5 emails de acceso/día en Spark** y **25.000/día en Blaze**. El proyecto debe
  disponer de cuota suficiente; esta implementación no cambia su facturación.

El acceso por enlace no necesita que `authDomain` coincida con el dominio de la
aplicación, a diferencia de la redirección OAuth de Google en navegadores con
almacenamiento particionado. El dominio de retorno sí debe estar autorizado.

## Privacidad y recuperación

- El correo nunca se añade como parámetro al enlace de retorno. Firebase recibe
  por separado la dirección y el código para impedir inyección de sesiones.
- El navegador recuerda únicamente la dirección durante un máximo de 24 horas
  para rellenar el formulario. Se elimina al completar la verificación. Si el
  almacenamiento falla o el enlace se abre en otro dispositivo, se pide el correo.
- Los tokens no se guardan en localStorage. Las páginas de login usan `no-store`
  y `Referrer-Policy: no-referrer` para no propagar el código mediante Referer.
- La interfaz espera un minuto entre solicitudes; los límites y protecciones
  contra abuso efectivos los aplica Firebase, también fuera de la interfaz.
- Un enlace vencido/usado o un correo incorrecto no crean sesión. Se permite
  corregir la dirección, solicitar otro enlace o volver a Google. Si falla el
  intercambio de sesión después de consumir el enlace, hay que solicitar otro.
- No se consulta si una dirección ya está registrada antes de enviar el enlace.

## Validación

Las pruebas locales simulan Firebase y no envían correos reales. Cubren envío,
retorno con campaña, validación de direcciones, almacenamiento bloqueado,
otro dispositivo, enlaces rechazados, limpieza de sesión y control de admisión.

Antes de publicar, probar con un destinatario autorizado: envío y recepción real,
retorno desde Safari iOS, otro navegador sin almacenamiento previo, enlace usado,
cuenta nueva de reseñas y cuenta sin permiso para módulos privados. Confirmar que
el panel muestra el correo verificado y que Google sigue disponible.

Referencias: [acceso por enlace](https://firebase.google.com/docs/auth/web/email-link-auth),
[límites de Firebase](https://firebase.google.com/docs/auth/limits).
