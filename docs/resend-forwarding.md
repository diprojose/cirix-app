# Reenvío de cirixad.com

`POST https://cirixadv.com/api/webhooks/resend` recibe eventos `email.received`
firmados por Resend. Reenvía cualquier destinatario de `cirixad.com` a
`ciro.advertising@gmail.com`, con contenido y adjuntos del original.
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
Comprobar adjuntos y Reply-To.

## Respuestas desde Gmail

Los correos nuevos incluyen un Reply-To privado `reply+<token>@cirixad.com`.
Al responder normalmente desde ciro.advertising@gmail.com, Resend recibe la respuesta
y el webhook la envía desde el alias original (ej. prueba@cirixad.com) al primer
Reply-To del corresponsal o, si no existe, a su From. Si hay varios alias de destino,
se elige el primero del To original que coincida con el sobre recibido.
No se replica CC/BCC ni se implementa responder a todos.

Firestore guarda únicamente las rutas de respuesta, sin cuerpos, en mailReplyRoutes.
El documento usa un hash del token y vence lógicamente a los 90 días; no hay limpieza
TTL configurada. El token es estable por mensaje y no se registra en logs.
Se exige From exacto del operador y DKIM de gmail.com válido sobre cuerpo completo,
From y To. Los tokens desconocidos/vencidos, autores no autenticados, autorespuestas
y mensajes ya reenviados por el relay no generan envíos. Los fallos temporales de
verificación o almacenamiento producen 503 para reintentar.

El From externo será el alias de Cirix. El texto, firma y citas escritos por Gmail
se conservan: el operador debe quitar su firma personal si no quiere incluirla.
Los correos anteriores a este cambio no adquieren el Reply-To privado retroactivamente.
Prueba final: recibir un mensaje nuevo, responder desde Gmail y confirmar en Resend
la salida desde el alias al corresponsal original. No basta simular el From de Gmail.
