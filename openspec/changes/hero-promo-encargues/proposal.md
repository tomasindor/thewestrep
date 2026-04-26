# Proposal: Hero Promo Encargues

## Intent

Reemplazar el top de la home por un hero urbano centrado en encargues que empuje una promo clara: **30% OFF en la segunda unidad** al combinar **1 pantalón + 1 buzo o campera**, aplicando el descuento sobre la prenda más barata. El CTA debe llevar a `/encargue` con un preset robusto, medible y desacoplado de category IDs opacos.

## Scope

### In Scope
- Nuevo hero promo en home con narrativa, CTA “Armá tu combo” y composición visual curada.
- Preset promo server-driven para `/encargue` que active pantalones, buzos y camperas y muestre banner explicativo.
- Fuente manual de curación para 6 productos top y 6 bottom con assets cutout optimizados.
- Animación híbrida liviana usando Keen existente donde aporte y CSS para micro-motion.

### Out of Scope
- Refactor genérico de filtros multi-categoría para todo el catálogo.
- Automatización de background removal o pipeline nuevo de assets.

## Capabilities

### New Capabilities
- `home-hero-promo-encargues`: Hero promocional curado para home con rails visuales y CTA de campaña.
- `encargue-promo-presets`: Presets de campaña en `/encargue` que activan filtros internos y messaging promo.

### Modified Capabilities
- None

## Approach

Implementar `?promo=combo-2da-30` como preset semántico. El hero reemplaza la sección superior actual con dos rails compactos: arriba buzos/camperas y abajo pantalones. El destino interpreta el preset en servidor, activa las tres categorías sin exponer IDs, renderiza banner con reglas de promo y permite desmontar el preset si el usuario sigue filtrando.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `components/marketing/homepage.tsx` | Modified | Reemplazo del hero superior |
| `components/marketing/brands-slider.tsx` | Modified | Patrón/reuso de Keen para rails |
| `app/encargue/page.tsx` | Modified | Entrada del preset promo |
| `components/catalog/catalog-listing-page.tsx` | Modified | Banner explicativo promo |
| `lib/catalog/models.ts`, `lib/catalog/selectors.ts` | Modified | Resolución semántica del preset |
| `lib/pricing/encargue-combos-core.ts` | Modified | Alineación de copy/regla promo |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Curación manual inconsistente | Med | Definir fuente única para 12 productos |
| Confusión entre preset y filtros UI | Med | Banner + estado visible + clear behavior |
| Sobrecosto visual en mobile | Med | Keen en performance mode + CSS liviano |

## Rollback Plan

Restaurar el hero actual, quitar el preset `combo-2da-30` y ocultar el banner promo sin tocar el catálogo general.

## Dependencies

- Assets cutout preparados manualmente.
- Validación comercial final del copy y condiciones de promo.

## Success Criteria

- [ ] La home muestra el nuevo hero promo con 6 visuales top y 6 bottom curados.
- [ ] El CTA abre `/encargue` con preset activo sin depender de category IDs crudos.
- [ ] `/encargue` comunica la regla pantalón + buzo/campera y el descuento sobre la prenda más barata.
- [ ] La experiencia mantiene una animación liviana y estable en mobile.
