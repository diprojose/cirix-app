# Reenvío de cirixad.com

`POST https://cirixadv.com/api/webhooks/resend` recibe eventos `email.received`
firmados por Resend. Reenvía cualquier destinatario de `cirixad.com` a
`ciro.advertising@gmail.com`, con contenido, adjuntos y Reply-To del original.
El remitente de salida es `Cirix Mail <forward@cirixad.com>`.

Variables privadas de producción: `RESEND_API_KEY` (con permiso de lectura de
correos recibidos y envío) y `RESEND_WEBHOOK_SECRET` (del webhook).
No son credenciales del MCP: la aplicación necesita sus propias credenciales.

Los cinco registros de envío/recepción se obtienen en Resend > Domains > cirixad.com.
Los DNS autoritativos se administran en Hostinger. No cambiar los registros de la web.

El endpoint rechaza firmas inválidas, ignora otros dominios y eventos, y devuelve
503 si falla el envío para permitir reintentos. Usa el ID del correo como clave de
idempotencia de Resend; su ventana de deduplicación es de 24 horas. Un reenvío manual
fuera de esa ventana puede duplicar el mensaje. Las cuotas del plan también afectan
la recepción y el envío: revisar el consumo en Resend. No es un archivo permanente.

Prueba de aceptación: enviar un correo externo a una dirección nueva de cirixad.com,
verificar el evento recibido, respuesta 200 del webhook y entrega del reenvío en Gmail.
Comprobar adjuntos y Reply-To. Responder desde Gmail usa la identidad de Gmail.
