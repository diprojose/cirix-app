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

## Referencias

- [Crear y enviar un sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Nombre del sitio y datos WebSite](https://developers.google.com/search/docs/appearance/site-names)
- [Excluir páginas con noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [Favicon en los resultados](https://developers.google.com/search/docs/appearance/favicon-in-search)
