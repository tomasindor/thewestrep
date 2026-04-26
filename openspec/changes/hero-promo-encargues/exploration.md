## Exploration: hero-promo-encargues

### Current State
La home hoy usa un hero estático server-rendered: texto + CTAs (`/stock`, `/encargue`) y una sola imagen editorial grande, sin promo específica ni animación de productos (`components/marketing/homepage.tsx`). Más abajo ya existe merchandising de combos encargue, pero no vive en el hero y está basado en `comboGroup` detectado, no en una promo abierta de “cualquier pantalón + cualquier buzo/campera” (`components/marketing/homepage.tsx`, `lib/catalog/selectors.ts`, `lib/pricing/encargue-combos-core.ts`).

El destino de encargues reutiliza `CatalogListingPage` y hoy sólo entiende **un** `brand` y **un** `category` en querystring; `getCatalogFiltersFromSearchParams()` toma el primer valor y `getCatalogFilterHref()` serializa un solo `category`, así que el flujo actual NO puede representar pantalones + buzos + camperas al mismo tiempo (`app/encargue/page.tsx`, `components/catalog/catalog-listing-page.tsx`, `components/catalog/catalog-filters.tsx`, `components/ui/search-sort-toolbar.tsx`, `lib/catalog/models.ts`, `lib/catalog/selectors.ts`). Además, las categorías en DB se crean con IDs opacos (`createId("category")`), así que hardcodear una URL de marketing con IDs reales sería frágil; hoy el sistema navega por ID interno, no por slug (`scripts/setup-brands-categories.ts`).

La factibilidad visual es buena: el stack ya tiene Keen Slider en producción con `renderMode: "performance"`, autoplay continuo y breakpoints responsivos (`components/marketing/brands-slider.tsx`, `components/catalog/related-products-carousel.tsx`). También existe una presentación “clean” con `SmartImage` y `object-contain` en PDP, útil para una composición con cutouts livianos (`components/ui/smart-image.tsx`, `components/catalog/product-image-gallery.tsx`, `lib/media/product-images.ts`). Lo que NO existe hoy es una fuente de curación manual para “6 arriba / 6 abajo”; homepage categories y featured products se calculan de forma automática o random (`lib/catalog/selectors.ts`). Tampoco hay banner explicativo promo en `/encargue`.

### Affected Areas
- `components/marketing/homepage.tsx` — hero actual; punto principal para reemplazar o insertar la promo urbana con CTA “Armá tu combo”.
- `components/marketing/brands-slider.tsx` — referencia directa del stack Keen reutilizable para dos rails compactos con autoplay suave.
- `components/catalog/catalog-listing-page.tsx` — destino `/encargue`; ahí debería vivir el badge/banner explicativo de promo.
- `components/catalog/catalog-filters.tsx` — UI actual de filtros single-select; no soporta tres categorías activas a la vez.
- `components/ui/search-sort-toolbar.tsx` — preserva params simples; habría que revisar compatibilidad con preset promo o multi-categoría.
- `lib/catalog/selectors.ts` — parseo de search params y matching actual; hoy `categoryId` es singular.
- `lib/catalog/models.ts` — contrato de filtros y serialización de URLs; hoy sólo modela una categoría.
- `lib/pricing/encargue-combos-core.ts` — ya codifica la regla de 30% sobre la prenda más barata y reconoce `buzos`, `camperas` y `pantalones`; buen punto de alineación semántica con la promo.
- `app/encargue/combos/page.tsx` — landing existente de combos/look completos; útil como referencia, pero no calza 1:1 con la promo abierta de cualquier pantalón + cualquier buzo/campera.
- `scripts/setup-brands-categories.ts` — evidencia de que las categorías reales usan IDs opacos; riesgo para deep links de marketing.

### Approaches
1. **Preset promo en `/encargue` + hero híbrido con Keen** — Agregar un param tipo `?promo=combo-2da-30` que active internamente pantalones+buzos+camperas, muestre banner explicativo y renderice el hero con dos filas compactas reutilizando Keen + microanimaciones CSS.
   - Pros: evita hardcodear category IDs, menor invasión sobre el sistema actual, mantiene el CTA en `/encargue`, calza bien con el KPI de CTR y con una implementación liviana.
   - Cons: introduce lógica especial de campaña; es menos reusable que un filtro multi-categoría genérico.
   - Effort: Medium

2. **Filtro multi-categoría genérico (OR) + hero híbrido con Keen** — Extender el catálogo para aceptar varias categorías activas (por slug o por array) y reflejarlas en URL/UI.
   - Pros: solución más limpia y reusable; la URL expresa de verdad “pantalones + buzos + camperas”.
   - Cons: toca parser, modelos, serialización, toolbar y UI de filtros; más superficie y más riesgo para esta campaña puntual.
   - Effort: Medium/High

3. **Mandar el CTA a `/encargue/combos`** — Reusar la landing existente de combos y vestirla con la promo.
   - Pros: menor cambio inicial.
   - Cons: conceptualmente incorrecto para el requerimiento; esa pantalla navega looks/pairs existentes por `comboGroup`, no el universo abierto de cualquier pantalón + cualquier buzo/campera.
   - Effort: Low/Medium

### Recommendation
Recomiendo **Approach 1**. Para esta campaña importa más salir con una experiencia CLARA, liviana y medible que abrir una refactorización grande de filtros. El mejor balance es: hero nuevo en home con dos rails compactos (fila superior buzos/camperas, inferior pantalones), 6 productos curados por fila, Keen reutilizado sólo donde aporte movimiento horizontal, y microanimaciones CSS de opacidad/translate/scale sin video ni canvas. El CTA debería caer en `/encargue` con un preset promo server-driven que filtre esas tres categorías, renderice un banner tipo “30% OFF en la segunda unidad · aplica al combinar 1 pantalón + 1 buzo/campera · descuento sobre la prenda más barata · promo por tiempo limitado · una compra por envío”, y permita desmontar el preset luego si el usuario sigue explorando.

Si después quieren convertir esto en capacidad reusable del catálogo, el paso natural es evolucionar ese preset a un filtro multi-categoría por slug. Pero para ESTE cambio, preset + hero híbrido reutilizando Keen es la opción más sana.

### Risks
- **Deep link frágil por IDs**: hoy `category` usa IDs internos, no slugs; si se arma una URL fija desde marketing, puede romperse entre entornos.
- **No hay curación manual existente**: no existe hoy una fuente/config para seleccionar exactamente 6 productos arriba y 6 abajo.
- **Cutouts no automatizados**: el stack muestra imágenes de forma eficiente, pero no hay pipeline de background removal; las imágenes “recortadas” deben venir ya preparadas o curarse manualmente.
- **UI de filtros**: si el preset promo convive con filtros single-select sin diseño claro, puede confundir qué está realmente activo.
- **Semántica promo vs comboGroup**: la promo pedida es abierta por categoría; no debe mezclarse mentalmente con la lógica actual de `comboGroup`/look completo.
- **Performance mobile**: dos filas animadas son factibles, pero hay que limitar densidad visual, autoplay y blur para no castigar scroll y LCP.

### Ready for Proposal
Yes — hay suficiente evidencia para proponer el cambio. La propuesta debería cerrar explícitamente: (1) si el destino usa preset promo o multi-categoría genérica, (2) dónde vive la curación manual de los 12 productos, y (3) qué formato tendrán los assets cutout para sostener la dirección visual sin volver lenta la home.
