# Twilio Call Tracking

## Flujo

Una llamada entra al número Twilio, que ejecuta `POST /api/webhooks/twilio/voice`. La aplicación valida `X-Twilio-Signature`, registra la llamada y responde TwiML con `<Dial answerOnBridge="true">`. El tramo al negocio informa sus cambios a `POST /api/webhooks/twilio/call-status`.

No se usa IVR, grabación, transcripción, Media Streams ni la API de llamadas salientes.

## Configuración

Copiar las variables de `.env.example` a `.env.local`. `TWILIO_ACCOUNT_SID` y `TWILIO_AUTH_TOKEN` son secretos exclusivamente server-side. Todos los teléfonos deben usar E.164.

`business_phone_numbers` tiene prioridad al resolver un destino. Si no existe un documento activo para el número marcado, se permite el fallback `TWILIO_PHONE_NUMBER` → `TWILIO_FORWARD_TO_NUMBER` dentro de `CALL_TRACKING_BUSINESS_ID`.

Desplegar los índices antes de producción:

```bash
npx firebase-tools deploy --only firestore:indexes
```

## Twilio Console

Después del upgrade, abrir el número de Twilio y configurar **A call comes in** como Webhook, método POST:

```text
https://DOMINIO/api/webhooks/twilio/voice
```

`TWILIO_WEBHOOK_BASE_URL` debe ser exactamente el origen HTTPS público usado por Twilio. Esto evita diferencias de firma detrás de Vercel, Cloudflare u otro proxy.

## Desarrollo y Trial

`TWILIO_TRIAL_MODE=true` solo muestra avisos y habilita el seed; nunca desactiva validación de firmas. Para datos de demostración:

```bash
npm run seed:calls
```

El script exige Trial y confirmación explícita, y reescribe 20 IDs deterministas sin mezclarlos accidentalmente con llamadas reales.

Twilio necesita una URL HTTPS pública. Sin instalar dependencias en el proyecto, se puede exponer el servidor local con una herramienta externa ya aprobada, por ejemplo `ngrok http 3000` o `cloudflared tunnel --url http://localhost:3000`, y usar ese origen en `TWILIO_WEBHOOK_BASE_URL` y en la consola.

## Pruebas

- Local: ejecutar `npm test`, `npx tsc --noEmit`, `npm run lint` y `npm run build`; después firmar requests de prueba con el Auth Token real o llamar desde un número verificado de Trial.
- Staging: configurar variables propias, desplegar índices y verificar una llamada atendida y otra no contestada.
- Producción: hacer upgrade, configurar el número, confirmar HTTPS, desplegar variables/índices y realizar una llamada de humo antes de anunciar el número.

## Troubleshooting

- `403`: revisar Auth Token y que la URL pública coincida exactamente, incluido protocolo, host, path y query.
- `<Hangup/>`: revisar configuración E.164, mapping activo y errores estructurados `twilio.call.incoming.failed`.
- Estados ausentes: confirmar que `<Number>` conserve el callback de estado y que Firestore tenga el índice desplegado.
- Nunca registrar Auth Token, cookies, cabeceras completas o teléfonos sin enmascarar.
