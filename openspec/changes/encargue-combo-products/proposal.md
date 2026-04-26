# Proposal: Encargue Combo Products

## Intent
Implementar combos elegibles de encargue con precio automático, inferencia desde importación y merchandising dedicado para PDP/home sin generar drift entre storefront, checkout, órdenes y Mercado Pago.

## Scope
### In Scope
- Modelar metadata de combo en catálogo/imports (`comboEligible`, `comboGroup`, `comboPriority`, `comboSourceKey`, score/origen de inferencia).
- Centralizar pricing en un engine puro reutilizado por cart, checkout, orders y Mercado Pago, con snapshots numéricos auditables.
- Inferir importer combo groups con confidence gating: auto-promote sólo high confidence; low confidence queda visible/bloqueado para revisión operativa.
- Agregar merchandising de combos en PDP, cards/listings de encargue y homepage/hero/landing.

### Out of Scope
- Descuentos arbitrarios distintos al combo top+bottom definido por PRD.
- Backoffice completo de edición manual de looks beyond minimal review visibility.
- Rediseño total de checkout o catálogo fuera del messaging/rail de combos.

## Capabilities
### New Capabilities
- `encargue-combo-pricing`: pricing centralizado y persistido para combos elegibles.
- `encargue-combo-merchandising`: descubrimiento y promoción de pares/look en PDP y superficies de marketing.
- `encargue-combo-import-inference`: inferencia y gating operativo de combos desde imports.

### Modified Capabilities
- None.

## Approach
- Persistir combo metadata en producto + snapshots de pricing por orden/ítem; evitar `priceDisplay` como fuente de verdad.
- Crear `lib/pricing/encargue-combos.ts` para emparejar top/bottom elegibles, ordenar por precio ascendente y aplicar 30% al ítem más barato de cada par.
- Resolver merchandising con selector jerárquico: opposite group + same source key/look, luego fallback por marca/categoría.
- Mantener boundaries de Clean Architecture en `lib/` y compatibilidad App Router/Server Components en `app/`/`components/`.
- Seguridad/pagos: Mercado Pago y API de órdenes deben consumir el mismo cálculo/snapshot; no cambia auth, sí consistencia financiera.

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `lib/db/schema.ts`, `lib/catalog/*`, `lib/imports/*` | Modified | Metadata, inference, promotion |
| `lib/pricing/*`, `lib/orders/*`, `lib/payments/*`, `lib/cart/*` | Modified/New | Engine único, breakdowns, snapshots |
| `components/catalog/*`, `components/marketing/homepage.tsx`, `app/encargue/*` | Modified | PDP rail, cards/listing messaging, landing/hero |
| `components/admin/imports-review-client.tsx` | Modified | Visibilidad de confidence gating |

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Drift de pricing/pagos | High | Engine único + snapshots persistidos |
| Inferencia errónea | Med | Confidence thresholds + fallback/review |
| Merchandising stale por cache | Med | Revalidación explícita tras import/promote |

## Rollback Plan
Desactivar surfaces de combo y promotion gating, revertir lectura de metadata nueva y volver a pricing unitario; mantener columnas/snapshots ignorados hasta limpiar en cambio posterior.

## Dependencies
- Migración Drizzle para metadata/snapshots.
- Cobertura unitaria del pricing engine y E2E de storefront/checkout de encargue.

## Success Criteria
- [ ] Cart, checkout, order persistence y Mercado Pago muestran el mismo total/desglose de combo.
- [ ] Productos low-confidence no se merchandisean automáticamente como combo.
- [ ] PDP/home/listings exponen CTA/rail/hero de combo sin romper fallback estándar de encargue.
- [ ] Orders conservan snapshot auditable por línea del descuento aplicado.
