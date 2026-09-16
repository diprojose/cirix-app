# Solicitud de Google Review

Entrada pública `/review`, localizada por el proxy existente en `/es/review` o
`/en/review`. No requiere sesión. Aparece en el catálogo de módulos del portal.

`NEXT_PUBLIC_GOOGLE_REVIEW_URL` configura el destino durante el build. Su valor
predeterminado está centralizado en `lib/constants.ts`. El dominio del portal no
se cambia: publicar en `cirixad.com` requiere que ese dominio apunte a este despliegue.

## Flujo

Rating y comentario opcionales, sin filtrar por puntuación. El botón intenta
copiar el comentario recortado y navega en la misma pestaña. La copia tiene un
límite de 1,2 segundos para que un permiso pendiente no detenga la navegación.
Volver desde Google restablece el botón incluso con el back/forward cache.
El cliente elige de nuevo la puntuación y publica manualmente en Google.

Se reutilizan logo, fuentes, tokens de color, proveedor de idioma y routing.
La página tiene metadata `noindex`, carece de navegación de comercio y oculta
la invitación de instalación de la PWA. Estrellas con foco itinerante, flechas,
Home/End y activación nativa con espacio/Enter; áreas táctiles de 52 px.

## Medición interna

Eventos: `review_page_view`, `review_rating_selected`, `review_text_started`
(una vez por formulario) y `review_google_clicked`. No se infiere publicación.

`POST /api/reviews/events` registra JSON estructurado en los logs del servidor,
siguiendo el patrón de eventos operativos del proyecto. Consultar/contar por
`module = reviews`, `event` y `source` en el proveedor de logs del despliegue.
No hay dashboard ni persistencia en Firestore; la retención depende del proveedor
de logs. Es telemetría de mejor esfuerzo, no un contador garantizado de conversiones.

Pixel Hub está orientado a sitios registrados, consentimiento e identificadores
de visitante/sesión. Esta landing usa medición anónima sin cookies ni esos IDs;
reutiliza las validaciones HTTP de ese módulo y no activa píxeles publicitarios.
Respeta Do Not Track y Global Privacy Control. Solo admite nombre de evento,
`rating`, `hasComment` y `source`; rechaza propiedades adicionales. No envía ni
guarda comentarios, nombres, teléfonos, correo, IP ni URL de origen en el evento.
Los logs de acceso de la infraestructura se administran por separado.

Los orígenes admitidos son `qr`, `whatsapp`, `email`, `sms`, `direct`; valores
desconocidos se normalizan a `direct` para no registrar texto arbitrario.
Ejemplo: `/review?source=qr`. El endpoint exige mismo origen, limita el cuerpo
mediante el lector existente y no expone lecturas. El envío usa `keepalive` y
no espera al servidor. El comentario permanece solo en memoria/portapapeles.

## Verificación

`npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.
Las pruebas de `test/reviews.test.ts` cubren navegación con clipboard ausente,
rechazado o pendiente; payload privado y no bloqueante; validación del endpoint.
Las pruebas de rutas verifican acceso público, query strings y aislamiento
de rutas privadas. Para revisión visual: móvil de 320/390 px, escritorio,
zoom al 200 %, tabulación, flechas, 1–5 estrellas y vuelta desde Google.
