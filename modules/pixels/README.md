# Pixel Hub

Módulo disponible en `/es/pixels` y `/en/pixels`. Implementa registro de sitios e IDs publicitarios, recolección propia de eventos con consentimiento, campañas UTM y diagnóstico reciente. Los datos se aíslan por el UID de la cuenta que registra cada sitio.

## Guía descargable

El botón **Descargar guía .md** está disponible en la cabecera del contenido y en la sección de instalación. Genera un archivo Markdown en el idioma del panel con los pasos de registro, instalación, consentimiento, conversiones, verificación y preparación de producción. Con un sitio seleccionado, incluye su ID, origen autorizado y el código de instalación usando la URL de la plataforma abierta. Sin un sitio seleccionado, utiliza `YOUR_SITE_ID` como marcador que debe sustituirse. Para instalar en producción, descarga la guía desde la plataforma publicada con HTTPS.

## Conectar la web Cirix

1. Publicar esta versión de `cirix-tech-platform` en `https://cirixadv.com`, con las credenciales Firebase Admin que ya utiliza la plataforma.
2. Entrar en Pixel Hub con la cuenta responsable, registrar `https://cirixad.com` y copiar **Configuración para cirix/index.html** a `cirix/js/pixel-config.js`. El ID es público, no un token secreto.
3. Publicar la web estática. Su `index.html` carga `pixel-config.js` y `pixel-consent.js`. La configuración vacía deja el seguimiento deshabilitado. Si la web sirve `www` sin redirigir al dominio canónico, registrar ese origen por separado y usar su configuración en ese host.
4. Desplegar las políticas TTL de `firestore.indexes.json` para `pixel_events.expiresAt` (90 días) y `pixel_rate_limits.expiresAt` (1 día). Comprobar que estén activas antes de recopilar datos de producción. El filtro del panel excluye eventos vencidos, pero no los borra físicamente. Firestore puede tardar en ejecutar el borrado: [documentación oficial de TTL](https://firebase.google.com/docs/firestore/ttl).
5. Asegurar que las reglas Firestore del proyecto denieguen todo acceso directo de clientes a `pixel_sites` y sus subcolecciones. Los handlers usan Admin SDK con autorización propia. No se modifican automáticamente las reglas globales del proyecto existente.
6. Visitar la web: antes de aceptar no debe salir ninguna petición al colector. Aceptar analítica debe producir un `page_view` con respuesta 201; “Actualizar” en el panel debe mostrarlo. Rechazar o retirar debe impedir eventos posteriores. Comprobar también GPC, bloqueadores, dominio `www` y fallo de red.
7. Enviar un formulario válido: `generate_lead` solo se dispara después de que CRM confirme la recepción. Los clics en enlaces de teléfono, correo o WhatsApp producen `contact`. No se envían los campos del formulario al colector.

El adaptador estático está versionado también en `integrations/cirix/`. El consentimiento de preferencias se guarda durante 90 días y puede cambiarse desde el pie de página. Antes de publicar, la política de privacidad del sitio debe describir las finalidades, conservación y destinatarios realmente habilitados.

## Contrato de medición

- `GET /pixel.js`: SDK público. No accede al almacenamiento ni envía eventos antes de `cirixPixel.consent({ analytics: true, marketing: …, version: "1" })`. La integración debe usar la elección real, nunca un consentimiento fijo. Si carga asíncronamente, esperar `cirix:ready`.
- `POST /api/pixels/collect?siteId=<uuid>`: JSON de hasta 8 KiB; el `Origin` debe coincidir exactamente con un sitio activo. Se valida otra vez el sitio dentro de la transacción para respetar pausas concurrentes.
- Eventos: `page_view`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase`, `generate_lead`, `contact`, `engagement`, `scroll`. `purchase` exige `value` y `currency`.
- `eventId` UUID identifica la acción. El servidor acepta una vez cada ID por sitio; los reintentos deben conservarlo. Una compra debe usar un UUID persistido por pedido. La fecha `receivedAt` la establece el servidor.
- IDs aleatorios separados por sitio: navegador con vencimiento a 90 días y sesión de pestaña con vencimiento a 30 minutos de inactividad, renovada por eventos. Si el almacenamiento falla se utilizan IDs en memoria. No hay resolución de identidad entre dispositivos.
- UTM admitidos: source, medium y campaign. La campaña de entrada, ruta inicial y dominio referente externo sin query persisten en sessionStorage durante la sesión. Nuevas UTM dentro de la sesión no reemplazan la campaña de entrada. Una nueva sesión inicia otra atribución. No se atribuye entre dispositivos. La falta de fuente/referente se presenta como «Sin atribución», no como prueba de tráfico directo.
- `gclid`, `fbclid` y `ttclid` requieren consentimiento publicitario y se eliminan de nuevo en el servidor cuando falta. No se leen cookies publicitarias existentes.
- GPC y DNT bloquean el SDK; el colector también respeta `Sec-GPC: 1`. Retirar permiso elimina los IDs locales y detiene nuevos eventos. No borra retroactivamente registros ni notifica una revocación central: no usar la muestra como lista publicitaria activa.
- Se excluyen queries completas, formularios, IP, user-agent sin procesar y propiedades arbitrarias de los documentos de eventos. Se guardan categorías generales de dispositivo, navegador y sistema operativo (detección aproximada), idioma y, en Vercel, país y región aproximados suministrados por el hosting. No se solicitan coordenadas GPS ni se persiste la IP. Fuera de Vercel o sin cabeceras geográficas válidas, la ubicación queda ausente. Evitar instalar el SDK en rutas que contengan datos personales dentro del pathname; no incluir esos datos en parámetros UTM. El proveedor de hosting puede mantener sus propios logs de red.
- El SDK captura la primera página al otorgar consentimiento. En aplicaciones SPA, el router debe invocar `track("page_view")` para cada navegación. Los eventos comerciales requieren instrumentación explícita. No hay autocaptura de formularios o pulsaciones de teclado.

## Límites operativos y evolución profesional

El colector web es público: CORS limita navegadores, no autentica una visita ni demuestra consentimiento. El límite transaccional es 300 eventos nuevos por sitio/minuto y devuelve 429. Un atacante puede falsificar Origin y generar lecturas; para tráfico público de escala se requiere protección en el borde, cuotas, alertas, detección de abuso y una cola. No se garantiza reintento o entrega offline. El listado admite hasta 100 sitios. El informe carga todas las páginas de 500 eventos del período elegido (máximo 90 días), con un límite superior de tiempo fijo y cursor por receivedAt + ID. No muestra totales ni exporta un informe parcialmente cargado. La preparación de audiencias conserva una muestra separada de los últimos 100 eventos. La carga íntegra implica lecturas y memoria proporcionales al volumen; a gran escala, usar períodos cortos o migrar a agregados diarios y un almacén analítico.

Los IDs de Meta, Google Ads/GA4, TikTok, LinkedIn, Pinterest, Snapchat y otros proveedores son **inventario**. No se instalan etiquetas de esos proveedores ni se envían conversiones a sus APIs. La vista de permisos publicitarios es una muestra de diagnóstico, no una audiencia exportada ni una cifra de alcance.

Siguientes piezas de la arquitectura:

1. Registro central versionado de consentimiento y revocaciones, eliminación de datos por visitante y supresión de audiencias.
2. Conectores específicos, secretos solo en servidor, mapeo de eventos, API de conversiones, cola de entrega con reintentos e idempotencia compartida con etiquetas de navegador.
3. Segmentos con ventanas temporales y exclusiones (p. ej. vio servicio en 30 días, excluye leads), estimación de elegibilidad y sincronización con cuentas publicitarias autorizadas.
4. Verificación de dominio, organizaciones/equipos, auditoría de cambios, WAF y permisos por rol.
5. Agregados diarios, atribución con modelos explícitos, embudos y almacenamiento analítico adecuado al volumen.

La medición seudónima no obtiene automáticamente nombre, correo o identidad social. Un formulario voluntario es un flujo separado. Bloqueadores, restricciones del navegador y decisiones del visitante impiden prometer una captura del 100 %.

Referencias: [Consent Mode de Google](https://developers.google.com/tag-platform/security/concepts/consent-mode), [configuración de consentimiento](https://developers.google.com/tag-platform/security/guides/consent). Este SDK propio no implementa ni sustituye Google Consent Mode para etiquetas Google.

## Panel de rendimiento y diagnóstico v2

- Selector hoy / 7 / 30 / 90 días y fechas personalizadas, en UTC. Retención efectiva de 90 días móviles.
- Sesiones observadas, navegadores únicos, clics de contacto, solicitudes, compras y conversión por sesión. Conversión = sesiones con generate_lead o purchase / sesiones con cualquier evento. Una sesión puede cruzar el período; no se infieren eventos fuera del intervalo.
- Vistas y conversiones diarias, fuentes por sesiones observadas y páginas con contactos. Los importes de compras se suman por moneda; no se mezclan monedas ni valores de leads con ingresos.
- Filtros de evento, fuente, dispositivo y búsqueda de ruta/campaña/ID/ubicación. Afectan la actividad y el CSV; el resumen conserva el período completo. CSV con escapado y neutralización de fórmulas.
- Detalle de evento y recorrido por sesión, incluyendo permisos, atribución e identificadores. Los campos ausentes en eventos antiguos se muestran como no disponibles; no se inventan datos históricos.
- API privada: GET /api/pixels/sites/:id?from=<ISO UTC>&to=<ISO UTC>, con cursorTime y cursorId de nextCursor. Sin período mantiene el diagnóstico de los últimos 100 eventos. Se verifica el propietario antes de consultar eventos.

### Instrumentación automática

SDK v2 registra enlaces de WhatsApp, teléfono y correo como contact con contactChannel. No captura el número, dirección ni texto del enlace. El adaptador Cirix evita duplicarlos con SDK v2. Formularios, leads y compras mantienen instrumentación explícita tras confirmar la operación. CRM/calificación comercial y conectores publicitarios son integraciones independientes; no se infieren esos resultados.

scroll registra el mayor hito nuevo observado de 25/50/75/100 %, una vez por hito y página; puede saltar hitos. Solo mide páginas desplazables. engagement envía incrementos de tiempo visible y con foco, mientras haya actividad en los últimos 60 segundos, cada 30 segundos acumulados y al ocultar/cerrar. Es una aproximación al tiempo activo, no prueba de lectura; la entrega al cerrar no está garantizada. En SPA, llamar track('page_view') tras cada cambio de ruta. No se capturan campos o contenido del usuario.

Publicar la plataforma (incluye /pixel.js) y actualizar el adaptador copiado en la web externa cuando corresponda. El banner debe describir la medición ampliada. Los eventos almacenados conservan su información original. La ubicación se obtiene al servir el colector detrás de Vercel; ver [cabeceras del hosting](https://vercel.com/docs/headers/request-headers). El índice automático descendente de receivedAt, con __name__ en la misma dirección, sirve para paginar; no se modifica la retención.
