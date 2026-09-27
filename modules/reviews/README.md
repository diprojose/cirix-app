# Google Reviews

Panel privado para cuentas habilitadas de la plataforma: `/reviews` (`/es/reviews`, `/en/reviews`). No requiere el rol de operador de Loyalty. Entrada para cualquier persona autenticada con Google mediante Firebase: `/make-a-review`; `/review` sigue funcionando con el mismo requisito. No requiere habilitación administrativa. El proxy conserva `ref` y `source` al iniciar sesión y localizar. Tras iniciar sesión, la entrada abre el formulario oficial de Google sin pedir estrellas, comentarios ni email por segunda vez. No publica en nombre del cliente.

## Operación

1. Crear una campaña y preparar invitaciones con datos manuales o clientes del CRM existente.
2. Abrir el mensaje en email, WhatsApp o SMS y enviarlo desde esa aplicación, o copiarlo. No se envían mensajes automáticamente.
3. Pulsar **Registrar envío** inmediatamente después de enviarlo. Guardar/copiar/abrir el mensaje no cuenta como envío. Las visitas a borradores se ignoran para evitar contar pruebas del operador.
4. Consultar los avances en el panel. Los QR de campaña son generales; la sesión verificada identifica al visitante cuando registra una interacción. Los enlaces individuales contienen un token aleatorio de 192 bits, nunca el email.

El email de invitación procede del CRM o del operador. La tabla de usuarios identifica la cuenta autenticada mediante Firebase. Google Business Profile no devuelve el email del autor de la reseña. Los enlaces pueden reenviarse; la identidad vinculada corresponde a quien inició sesión y no acredita quién escribió ni si publicó una reseña. No se filtran las invitaciones por satisfacción ni se ofrecen incentivos.

## KPIs

- Períodos móviles de 7, 30 y 90 días; filtros de campaña y canal.
- Enviadas: cohorte por `sentAt`, registrado por el operador; borradores excluidos.
- Abiertas: primera visita al enlace individual; clic a Google también implica apertura si las peticiones llegan desordenadas.
- Continuaron a Google: primera activación del enlace a Google. Apertura y clic se conservan en transacciones; repetir visitas no aumenta los contadores por invitación.
- Apertura = abiertas / enviadas. Efectividad de invitación = clics / enviadas. Sin denominador se muestra `—`.
- Las sesiones generales usan un UUID por pestaña en sessionStorage (memoria si el almacenamiento falla), por cuenta autenticada, campaña y canal. No son personas únicas y no se mezclan con el denominador de invitaciones enviadas.
- Google: reseñas nuevas por fecha de creación, período anterior de igual duración, cambio porcentual, promedio global, distribución y reseñas sin respuesta. Estos resultados son del negocio completo y no se atribuyen a campañas ni correos. No se calcula una supuesta conversión clic/reseña.

La telemetría es de mejor esfuerzo y respeta DNT/GPC. Se omiten bots conocidos; no constituye medición antifraude. Fallas de red, bloqueadores y cierres rápidos pueden producir subregistro. El enlace a Google funciona aunque falle el seguimiento o JavaScript.

## Firestore y acceso

Usa las credenciales Firebase Admin existentes. Colecciones `review_campaigns`, `review_invitations`, `review_links`, `review_visits`, `review_participants`, `review_rate_limits`. No permitir lectura/escritura de estas colecciones desde Firebase cliente: el panel y las APIs privadas comprueban una sesión de cuenta previamente habilitada, igual que CRM y Call Tracking; los cambios exigen mismo origen. El endpoint de eventos verifica una sesión de reseñas y valida un esquema estricto; nunca retorna datos de clientes.

Invitaciones y tokens expiran a los 180 días de creación; registrar envío extiende su retención 180 días desde el envío. Las consultas usan `reportAt` (creación o envío) para conservar cohortes completas de 90 días. Visitas duran 180 días desde la última interacción, pero los informes consultan 180 días desde la primera apertura. Los límites por minuto duran un día. Campañas y sus enlaces generales no expiran.

Activar las políticas TTL declaradas en `firestore.indexes.json` en el proyecto Firebase correspondiente. La declaración en el repositorio no activa TTL por sí sola. El código ignora invitaciones y enlaces expirados aunque la eliminación asíncrona no haya ocurrido. Para borrar un cliente, eliminar su documento de invitación y su token en `review_links` desde la consola administrativa.

El informe admite 500 campañas y 5.000 invitaciones / sesiones por ventana de retención. Si supera el límite devuelve un error explícito, nunca KPIs basados en una muestra truncada; para mayor volumen implementar agregación/paginación del servidor. Intake: 300 eventos/minuto globales, cuerpos máximos 8 KB. No se registran cuerpos, emails, IP ni secretos en logs de aplicación.

## Google Business Profile

El enlace público `NEXT_PUBLIC_GOOGLE_REVIEW_URL` ya permite solicitar reseñas, pero no autoriza su lectura. Para consultar el perfil verificado de Cirix:

1. Obtener acceso aprobado a Google Business Profile APIs en un proyecto Google Cloud y habilitar las APIs correspondientes.
2. Configurar OAuth y autorizar una cuenta administradora del perfil con scope `https://www.googleapis.com/auth/business.manage` y acceso offline. Obtener un refresh token mediante el flujo OAuth del proyecto, sin introducirlo en el navegador de la aplicación ni en el repositorio.
3. Configurar en `.env.local` y en los entornos Vercel apropiados: `GOOGLE_BUSINESS_CLIENT_ID`, `GOOGLE_BUSINESS_CLIENT_SECRET`, `GOOGLE_BUSINESS_REFRESH_TOKEN`, `GOOGLE_BUSINESS_ACCOUNT_ID`, `GOOGLE_BUSINESS_LOCATION_ID`. Los dos IDs son numéricos, sin prefijos `accounts/` o `locations/`. Estos cinco valores son exclusivamente del servidor.
4. Volver a desplegar y seleccionar **Consultar reseñas** en el panel. El indicador de configuración solo confirma presencia de variables; una consulta exitosa confirma acceso real. No existe un flujo OAuth de autoservicio dentro del panel.

Consulta paginada de 50 en 50, máximo 100 páginas y 45 segundos. Un error o token repetido aborta toda la consulta. No se persiste contenido de Google en Firestore, localStorage ni logs: se muestra en memoria durante la sesión, con fecha de consulta, respuestas `private, no-store` y botón manual para refrescar. El conteo/promedio global proviene de Google; no se usan fixtures como fallback.

Referencias oficiales: [listar reseñas](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list), [campos de reseña y autor](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews), [políticas](https://developers.google.com/my-business/content/policies).

## Validación

`npm run lint`, `npx tsc --noEmit`, `npm test`, `node scripts/check-contrast.mjs`, `npm run build`.
Pruebas: cohortes, filtros, ceros, privacidad, límites de intake, deduplicación transaccional, API Google paginada/errores y aislamiento de rutas. Validar manualmente el panel con operador y credenciales reales antes de una campaña comercial; comprobar envío, apertura, clic y consulta de reseñas en un entorno controlado.

## Estado por usuario autenticado

`POST /api/reviews/events` requiere la cookie de sesión y verifica la identidad mediante `getReviewViewer`, sin exigir admisión a módulos privados. El servidor obtiene UID, correo y nombre desde Firebase; el esquema rechaza estos campos si vienen en el cuerpo del navegador. La respuesta no expone identidad. Se mantienen mismo origen, DNT/GPC, límites y exclusión de bots.

`review_participants` guarda una fila por UID + campaña + canal, con primera visita, primer clic y última actividad. Las escrituras de estado, sesión y avance de invitación son transaccionales. Un clic implica visita; repetir eventos o volver a abrir no elimina el clic. Las cuentas que comparten pestaña se separan. La consulta privada del panel conserva su control de admisión administrativa.

El período de la tabla filtra última actividad; el estado conserva la progresión conocida dentro de la retención. Incluye búsqueda por nombre/correo, filtro de estado y paginación. Los usuarios solo aparecen al registrar una interacción, no por existir en Firebase. Las visitas históricas anónimas no se atribuyen retrospectivamente. El login y la página explican la vinculación.

Retención: 180 días desde la última interacción; se excluyen registros antiguos incluso si TTL no los ha borrado. Activar también TTL para `review_participants.expiresAt` en Firebase. Para eliminar los datos de un usuario, borrar sus documentos de `review_participants` por UID desde el entorno administrativo. El panel se actualiza cada 30 segundos mientras está visible y al volver a la pestaña.
