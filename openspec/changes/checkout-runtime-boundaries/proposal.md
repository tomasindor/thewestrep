# Proposal: Split Checkout Runtime Boundaries

## Intent
Resolver el error de bundling `node:crypto` en Next.js 16.2.1 causado por mezclar lógica compartida (`checkout.ts`) con dependencias exclusivas de Node.js (`randomUUID()`). 

El módulo actual viola los límites de runtime al exponer funciones server-only al cliente, lo que bloquea el build. La solución debe preservar la arquitectura limpia y los patrones de `lib/`.

## Scope

### In Scope
- Split de `lib/orders/checkout.ts` en `checkout.shared.ts` (cliente + servidor) y `checkout.server.ts` (server-only).
- Mover `buildOrderReference()` a `checkout.server.ts` y evitar su exposición al cliente.
- Actualizar consumidores: `use-checkout-controller.ts` (cliente), `app/api/orders/route.ts` (servidor), `lib/orders/repository.ts` (servidor).
- Garantizar que schemas de Zod y utilidades puras permanezcan en contexto compartido.

### Out of Scope
- Cambios en la lógica de negocio de `buildOrderReference()` o generación de referencias.
- Modificaciones en la API pública de `use-checkout-controller.ts`.
- Refactor de otros módulos de `lib/orders/` no afectados por el split.
- Cambios en la capa de persistencia (Drizzle ORM).

## Capabilities

### New Capabilities
- `checkout-runtime-boundaries`: Límites claros entre lógica compartida y server-only para el módulo de checkout.

### Modified Capabilities
- Ninguna. No hay cambios en los requisitos existentes, solo en la organización interna del módulo.

## Approach
1. **Split del módulo**: 
   - `checkout.shared.ts`: Contendrá schemas de Zod, utilidades puras (`getPriceAmount`), y lógica segura para cliente.
   - `checkout.server.ts`: Contendrá `buildOrderReference()` y cualquier lógica que dependa de Node.js (`node:crypto`).
2. **Actualización de consumidores**:
   - Cliente (`use-checkout-controller.ts`): Importará solo de `checkout.shared.ts`.
   - Servidor (`app/api/orders/route.ts`, `repository.ts`): Importará de ambos archivos según necesidad.
3. **Validación**:
   - TypeScript strict mode para detectar imports inválidos.
   - Pruebas unitarias para verificar que la lógica de negocio no se rompa.
   - Build de Next.js para confirmar que el error de `node:crypto` desaparezca.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `lib/orders/checkout.ts` | Removed | Split en dos archivos nuevos. |
| `lib/orders/checkout.shared.ts` | New | Lógica compartida (cliente + servidor). |
| `lib/orders/checkout.server.ts` | New | Lógica server-only (Node.js). |
| `hooks/use-checkout-controller.ts` | Modified | Importará solo de `checkout.shared.ts`. |
| `app/api/orders/route.ts` | Modified | Importará de ambos archivos según necesidad. |
| `lib/orders/repository.ts` | Modified | Importará de ambos archivos según necesidad. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Romper la lógica de negocio durante el split | Medium | Pruebas unitarias exhaustivas y validación manual de flujos críticos. |
| Importar server-only code en contexto cliente | Low | TypeScript strict mode + revisión manual de imports. |
| Errores de build en Next.js por límites de runtime | Low | Validación temprana con `next build`. |
| Inconsistencias en la generación de referencias de órdenes | Low | Pruebas unitarias para `buildOrderReference()` y validación manual. |

## Rollback Plan
1. **Revertir cambios en Git**:
   ```bash
   git revert HEAD --no-edit
   ```
2. **Restaurar `checkout.ts`**:
   - Eliminar `checkout.shared.ts` y `checkout.server.ts`.
   - Restaurar el contenido original de `checkout.ts` desde el último commit.
3. **Revertir consumidores**:
   - Actualizar `use-checkout-controller.ts`, `app/api/orders/route.ts`, y `repository.ts` para importar de `checkout.ts`.
4. **Validar**:
   - Ejecutar pruebas unitarias para confirmar que la lógica de negocio funciona.
   - Ejecutar `next build` para confirmar que el error de `node:crypto` reaparece (indicador de rollback exitoso).

## Dependencies
- **Next.js 16.2.1**: Para validar que los límites de runtime se respetan.
- **TypeScript 5.x (strict mode)**: Para detectar imports inválidos.

## Success Criteria
- [ ] `next build` se completa sin errores de `node:crypto`.
- [ ] `use-checkout-controller.ts` solo importa de `checkout.shared.ts`.
- [ ] `buildOrderReference()` solo es accesible desde contexto servidor.
- [ ] Todas las pruebas unitarias pasan (cobertura > 90% para el módulo).
- [ ] Los flujos de checkout (cliente + servidor) funcionan sin regresiones.