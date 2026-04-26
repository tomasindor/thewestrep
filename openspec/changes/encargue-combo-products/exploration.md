## Exploration: encargue-combo-products

### Current State
El catálogo hoy trata cada producto como una unidad aislada. `lib/catalog/types.ts`, `lib/db/schema.ts` y `lib/catalog/repository.ts` no tienen metadata de combos ni relaciones editoriales entre prendas. La PDP usa `getRelatedCatalogProducts()` en `lib/catalog/selectors.ts`, que sólo prioriza marca/categoría dentro de la misma availability; no existe lógica de “top/bottom”, look original ni merchandising específico para encargue. La homepage (`components/marketing/homepage.tsx`) destaca categorías de encargue y productos random de stock, pero no tiene un espacio promocional de combos.

La pricing flow tampoco tiene descuentos compuestos. El carrito guarda `priceDisplay` string en `components/cart/cart-provider.tsx` / `lib/cart/types.ts`; checkout y persistencia recalculan totales parseando ese string en `lib/orders/checkout.shared.ts`. `createOrderFromCheckout()` persiste sólo unit price / line total finales sin desglose de descuentos en `lib/orders/repository.ts`, y Mercado Pago vuelve a reconstruir ítems desde el mismo payload en `lib/payments/mercadopago-preference.ts`. Hoy la única regla transversal extra es el fee fijo de Correo Argentino para encargue.

El importer/scraper actual detecta álbumes Yupoo, deduplica imágenes y filtra assets obvios, pero no infiere outfits multi-prenda. `lib/imports/ingestion.ts` sólo persiste staging item + imágenes; `lib/imports/heuristics.ts` clasifica imágenes, no productos/look groups. `lib/imports/promotion.ts` promueve productos usando metadata básica (`finalName`, `brandName`, `categoryName`, `priceArs`, sizes, variants`) y no escribe campos de combo. La UI de revisión (`components/admin/imports-review-client.tsx`) permite editar nombre/precio/categoría, pero no revisar o corregir inferencias de combo.

### Affected Areas
- `lib/db/schema.ts` — faltan columnas JSON/snapshot para metadata de combo y desglose persistido de pricing.
- `lib/catalog/types.ts` — el modelo público de producto no expone `comboEligible`, `comboGroup`, prioridades ni source keys.
- `lib/catalog/repository.ts` — mapea DB→dominio y admin upsert; debe leer/escribir la nueva metadata sin romper server-only boundaries.
- `lib/catalog/selectors.ts` — hoy resuelve relacionados por marca/categoría; es el punto natural para un selector de “Completá el look”.
- `components/catalog/product-detail-page.tsx` + `components/catalog/related-products-carousel.tsx` — PDP actual no tiene bloque promo ni rail específico de combo.
- `components/catalog/product-card.tsx` + `components/catalog/catalog-listing-page.tsx` + `components/marketing/homepage.tsx` — listing/home necesitan messaging promocional sin ocultar el resto de encargue.
- `components/catalog/product-whatsapp-cta.tsx`, `components/cart/cart-provider.tsx`, `lib/cart/types.ts` — el carrito hoy conserva sólo precio renderizado; no alcanza para pricing centralizado con descuentos auditables.
- `hooks/use-checkout-controller.ts`, `components/cart/order-summary-sidebar.tsx`, `lib/orders/checkout.shared.ts` — resumen y totales deben pasar a un engine central de combos.
- `app/api/orders/route.ts`, `lib/orders/repository.ts`, `lib/payments/mercadopago-preference.ts` — checkout, persistencia y MP deben compartir exactamente el mismo cálculo y snapshot.
- `lib/imports/ingestion.ts`, `lib/imports/heuristics.ts`, `lib/imports/promotion.ts`, `components/admin/imports-review-client.tsx` — inference/promotion flow para generar metadata automática y bloquear low-confidence items.
- `app/encargue/[productId]/page.tsx`, `app/encargue/page.tsx` — rutas App Router ya siguen el contrato de Next 16 (`params/searchParams` como Promise); cualquier cambio en páginas debe preservar eso.

### Approaches
1. **Product-level combo metadata + centralized pricing engine** — Persistir elegibilidad/grupo/prioridad/source-key por producto y calcular el beneficio en una librería pura reutilizada por cart, checkout, MP y orders.
   - Pros: fuente única de verdad, consistente en UI + persistencia + pagos; soporta merchandising, snapshots y test unitarios puros; encaja con Clean Architecture.
   - Cons: requiere migración de schema, cambio de contrato del carrito y backfill/import inference.
   - Effort: High

2. **Runtime-only inference from category/name + ad-hoc discounting in checkout** — Inferir tops/bottoms al vuelo sin persistir metadata fuerte y aplicar el descuento sólo al resumir carrito/checkout.
   - Pros: menor cambio inicial de DB/admin.
   - Cons: inconsistente entre PDP/listing/importer/orders; difícil de auditar; MP/order snapshots pueden divergir; no resuelve “same original look” ni low-confidence gating.
   - Effort: Medium

### Recommendation
Recomiendo **Approach 1**. La regla del combo impacta descubrimiento, merchandising, carrito, checkout, pago y persistencia; si no se modela explícitamente en producto + pricing snapshot, vas a tener drift. La implementación más sana es: (a) extender producto/import metadata con `comboEligible`, `comboGroup`, `comboPriority`, `comboSourceKey`, `importInferredCombo`, `importInferenceScore`; (b) crear un engine puro tipo `lib/pricing/encargue-combos.ts` que reciba líneas elegibles, separe tops/bottoms, ordene por precio ascendente y asigne 30% al item más barato de cada par lowest-to-lowest; (c) hacer que cart/checkout/orders/MP trabajen con montos numéricos y breakdowns, no con `priceDisplay`; (d) agregar un selector merchandising para PDP/home basado en opposite-group → same source key/look → fallback brand/category.

### Risks
- **Drift de pricing**: hoy el sistema parsea `priceDisplay`; si no se cambia eso, cart/checkout/order/MP pueden mostrar o persistir descuentos distintos.
- **Migración de snapshots**: `orders.pricingSnapshot` y `order_items.itemSnapshot` no guardan descuentos por línea; sin ampliarlos no hay trazabilidad.
- **Inference quality**: el scraper actual no tiene señales semánticas de multi-garment look; si la heurística queda floja, podés promocionar productos incorrectos.
- **Admin visibility gap**: no existe UI para inspeccionar/corregir combo inference; aunque el PRD no pida mantenimiento manual, sí conviene visibilidad operacional.
- **Merchandising fallbacks**: algunos encargue no van a tener `comboSourceKey` confiable; el rail PDP necesita degradar elegantemente a brand/category sin verse roto.
- **Cache/data freshness**: selectors usan `cache()` en server; si se agregan nuevos campos y no se piensa invalidación/relectura post-admin/import, la promo puede quedar stale.

### Ready for Proposal
Yes — el cambio está suficientemente delimitado. La propuesta debería pedir: migración de schema/modelos, engine central de combo pricing con snapshots persistidos, inference/promotion metadata pipeline, selector PDP/home de merchandising y cobertura unitaria/e2e para pricing + storefront + import flow.
