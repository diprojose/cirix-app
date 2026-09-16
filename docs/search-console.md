# Google Search Console: Cirix Tech Portal

## Propiedad y sitemap

Selecciona la propiedad de dominio **cirixadv.com** en Search Console.
En **Indexación → Sitemaps → Añadir un sitemap**, introduce la URL completa:

```text
https://www.cirixadv.com/sitemap.xml
```

Pulsa **Enviar**. Si usas una propiedad de prefijo de URL y el formulario ya muestra
`https://www.cirixadv.com/`, introduce solo `sitemap.xml`.

El archivo lo genera `app/sitemap.ts`; no hay que subir un XML manualmente. Contiene
las dos páginas públicas que deben aparecer en búsquedas:

- https://www.cirixadv.com/en
- https://www.cirixadv.com/es

Cada entrada declara las versiones en inglés y español y la versión predeterminada
en inglés. La raíz redirige a `/en`, por lo que el sitemap incluye su destino canónico.
Los módulos y las demos requieren una cuenta autorizada y no se incluyen.

## Solicitar indexación

1. Abre **Inspección de URLs** e introduce `https://www.cirixadv.com/en`.
2. Pulsa **Probar URL publicada** y comprueba que Google pueda acceder a la página.
3. Pulsa **Solicitar indexación**.
4. Repite para `https://www.cirixadv.com/es` si quieres actualizar la versión española.
5. Revisa después el estado del sitemap y el informe de indexación de páginas.

Conserva el TXT `google-site-verification` en el DNS para mantener la verificación
de la propiedad. `cirixad.com` y `cirix.online` son dominios distintos; este repositorio
configura únicamente el portal `cirixadv.com`.

## Configuración del portal

| Elemento | Archivo | Comportamiento |
| --- | --- | --- |
| Sitemap | `app/sitemap.ts` | URLs canónicas públicas y alternativas de idioma |
| Rastreo | `app/robots.ts` | Permite la web y los iconos, excluye `/api/` y anuncia el sitemap |
| Metadatos | `lib/site-metadata.ts` | Título, descripción, canonical, hreflang, Open Graph y Twitter |
| Nombre del sitio | `app/page.tsx` | Datos estructurados `WebSite` para Cirix Tech Portal |
| Indexación | `app/layout.tsx` | `noindex, nofollow` heredado; la portada declara `index, follow` |
| Iconos | `app/favicon.ico`, `app/icon.png`, `public/brand/` | Marca Cirix accesible sin sesión |
| Acceso | `lib/auth/route-access.ts` | Sitemap, robots e iconos públicos; módulos protegidos |

El login se puede rastrear para que Google lea su etiqueta `noindex`. La autenticación
sigue protegiendo el contenido privado; `noindex` no es un mecanismo de acceso.

Al crear nuevas páginas públicas, define sus metadatos e indexación e inclúyelas en
el sitemap. No añadas URLs de login, APIs, acciones, redirecciones ni páginas privadas.
Si se añade `lastModified`, debe reflejar cambios reales del contenido, no la fecha
de cada compilación. Google ignora `priority` y `changeFrequency`.

Enviar el sitemap facilita el descubrimiento; no garantiza indexación, posiciones
ni actualización inmediata del favicon. Los resultados de búsqueda y el selector
de propiedades de Search Console pueden mostrar información anterior.

## Diagnóstico del informe del 16 de septiembre de 2026

El ZIP `cirixadv.com-Coverage-2026-09-16.zip` contiene un resumen, sin ejemplos
de URLs. Su última fila, del 13 de septiembre, registra 6 páginas indexadas y
4 sin indexar: 2 «Duplicada: el usuario no ha indicado ninguna versión canónica»
y 2 «Página con redirección». No permite identificar cuáles son esas cuatro URLs.

La comprobación pública del 16 de septiembre encontró:

- `/en` y `/es` responden 200 y ya declaran canonical hacia su versión HTTPS con
  `www`, además de `index, follow` y alternativas de idioma coherentes con el sitemap.
- Las versiones sin `www` también responden 200 con ese canonical.
- La raíz, con y sin `www`, redirige temporalmente (307) a `/en`.

El ajuste en `proxy.ts` consolida las portadas del dominio de producción mediante
308 hacia `https://www.cirixadv.com/en` o `/es`. Conserva los parámetros de consulta
y el idioma explícito; la raíz siempre elige inglés. Solo se aplica a navegación
GET/HEAD sin acciones. Desarrollo, previews, autenticación y endpoints de servicio
conservan su dominio. Este ajuste refuerza las señales canónicas existentes; no
demuestra que las dos duplicadas del informe fueran las variantes sin `www`.

Después de desplegar:

1. Comprobar que la raíz y las portadas sin `www` redirigen con 308 a la portada
   canónica correspondiente, y que `/en` y `/es` con `www` responden 200.
2. Abrir el detalle de «Duplicada: el usuario no ha indicado ninguna versión
   canónica» en Search Console e inspeccionar cada URL de ejemplo. Comparar la
   canónica declarada con la elegida por Google y probar la URL publicada.
3. Si los ejemplos corresponden a las variantes ya corregidas, pulsar **Validar
   corrección** y solicitar indexación de las dos URLs canónicas. Si son otras
   rutas, revisarlas antes de dar el problema por resuelto.
4. Mantener únicamente las URLs canónicas indexables en el sitemap actual.

«Página con redirección» es una exclusión esperada cuando su destino es correcto;
la URL de origen no necesita indexarse. No hay que eliminar las redirecciones
ni bloquear las variantes en robots.txt. Search Console necesita un nuevo rastreo
para reflejar los cambios; este informe por sí solo no confirma un fallo actual
de las etiquetas canónicas.

## Referencias

- [Consolidar URLs duplicadas](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Informe de indexación de páginas](https://support.google.com/webmasters/answer/7440203)

- [Crear y enviar un sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Nombre del sitio y datos WebSite](https://developers.google.com/search/docs/appearance/site-names)
- [Excluir páginas con noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [Favicon en los resultados](https://developers.google.com/search/docs/appearance/favicon-in-search)
