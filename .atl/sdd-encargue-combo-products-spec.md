# Spec Artifact: Encargue Combo Products

## Topic Key: sdd/encargue-combo-products/spec
## Created: 2026-04-18
## Status: Spec Complete

## Summary
Detailed specifications for combo-products PRD covering:
- Product metadata schema (combo_eligible, combo_group, combo_priority, combo_source_key)
- Centralized pricing engine in lib/pricing/encargue-combos.ts
- Importer inference with confidence gating (high: auto-promote, low: review)
- PDP "Completá el look" rail and merchandising surfaces
- Cart/checkout/Mercado Pago/order consistency via pure function pricing
- Admin auditing and visibility

## Key Decisions
1. **Pricing Purity**: calculateComboPricing() must be pure function - no side effects, ensures consistency
2. **Pairing Algorithm**: Group by combo_group, separate tops/bottoms, sort by price, pair by rank, 30% off lower item
3. **Confidence Thresholds**: 0.8+ auto-promote, 0.5-0.79 review, <0.5 no merchandising
4. **Snapshot Persistence**: order_items.item_snapshot includes comboDiscount metadata for auditing
5. **No Drift Guarantee**: Same pricing function used in cart, checkout, MP preference, order persistence

## Files
- openspec/changes/encargue-combo-products/spec.md (full spec)
- lib/pricing/encargue-combos.ts (to create - pricing engine)
- lib/catalog/combo-selectors.ts (to create - queries)
- lib/catalog/combo-inference.ts (to create - inference logic)
- components/catalog/combo-rail.tsx (to create - PDP component)

## Next Phase
Technical design (sdd-design) → Implementation tasks (sdd-tasks) → Apply (sdd-apply)
