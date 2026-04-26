const TOP_CATEGORIES = new Set(["remeras", "camisas", "buzos", "hoodies", "camperas", "tops"]);
const BOTTOM_CATEGORIES = new Set(["pantalones", "shorts", "pants", "trousers", "jeans"]);
const COMBO_DISCOUNT_RATE = 0.3;

export interface ComboPricingItem {
  lineId?: string;
  productId: string;
  productSlug: string;
  productName?: string;
  priceArs: number;
  quantity?: number;
  categorySlug?: string;
  comboGroup?: string;
  comboPriority?: number;
}

interface ExpandedComboUnit extends ComboPricingItem {
  quantity: number;
  lineId: string;
}

export interface ComboDiscountApplication {
  lineId: string;
  productId: string;
  productName: string;
  amountArs: number;
  pairedWithLineId?: string;
  pairedWithProductId?: string;
  pairedWithProductName?: string;
  comboGroup: string;
  reason: string;
}

export interface ComboPricingResult {
  originalTotal: number;
  comboDiscount: number;
  finalTotal: number;
  appliedDiscounts: ComboDiscountApplication[];
  appliedToProductId: string;
  appliedToProductName: string;
  discountAmount: number;
  pairingReason: string;
}

export interface ComboConfidenceFactors {
  hasExplicitGroup: boolean;
  albumTitleMatch: boolean;
  brandConsistency: boolean;
  priceRangeConsistency: boolean;
  hasMultipleProducts: boolean;
}

function normalizeCategory(value: string | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function isTopCategory(value: string | undefined) {
  const normalized = normalizeCategory(value);
  return TOP_CATEGORIES.has(normalized);
}

function isBottomCategory(value: string | undefined) {
  const normalized = normalizeCategory(value);
  return BOTTOM_CATEGORIES.has(normalized);
}

function expandItems(items: readonly ComboPricingItem[]): ExpandedComboUnit[] {
  return items.flatMap((item) => {
    const quantity = Math.max(1, Math.trunc(item.quantity ?? 1));
    const lineId = item.lineId ?? item.productId;

    return Array.from({ length: quantity }, () => ({
      ...item,
      quantity,
      lineId,
    }));
  });
}

export function calculateComboPricing(items: readonly ComboPricingItem[]): ComboPricingResult | null {
  const expanded = expandItems(items).filter((item) => item.comboGroup && item.comboGroup.trim().length > 0);

  if (expanded.length < 2) {
    return null;
  }

  const originalTotal = expandItems(items).reduce((sum, item) => sum + item.priceArs, 0);
  const grouped = new Map<string, ExpandedComboUnit[]>();

  for (const item of expanded) {
    const key = item.comboGroup!.trim();
    const bucket = grouped.get(key) ?? [];
    bucket.push(item);
    grouped.set(key, bucket);
  }

  const appliedDiscounts: ComboDiscountApplication[] = [];

  for (const [group, products] of grouped.entries()) {
    const tops = products
      .filter((product) => isTopCategory(product.categorySlug))
      .sort((left, right) => left.priceArs - right.priceArs);
    const bottoms = products
      .filter((product) => isBottomCategory(product.categorySlug))
      .sort((left, right) => left.priceArs - right.priceArs);

    const pairCount = Math.min(tops.length, bottoms.length);

    for (let index = 0; index < pairCount; index += 1) {
      const top = tops[index]!;
      const bottom = bottoms[index]!;
      const discounted = top.priceArs <= bottom.priceArs ? top : bottom;
      const paired = discounted === top ? bottom : top;
      const amountArs = Math.round(discounted.priceArs * COMBO_DISCOUNT_RATE);

      appliedDiscounts.push({
        lineId: discounted.lineId,
        productId: discounted.productId,
        productName: discounted.productName ?? discounted.productSlug,
        amountArs,
        pairedWithLineId: paired.lineId,
        pairedWithProductId: paired.productId,
        pairedWithProductName: paired.productName ?? paired.productSlug,
        comboGroup: group,
        reason: `Combo ${group}: 30% sobre la prenda más barata`,
      });
    }
  }

  if (appliedDiscounts.length === 0) {
    return null;
  }

  const comboDiscount = appliedDiscounts.reduce((sum, item) => sum + item.amountArs, 0);
  const firstDiscount = appliedDiscounts[0]!;

  return {
    originalTotal,
    comboDiscount,
    finalTotal: originalTotal - comboDiscount,
    appliedDiscounts,
    appliedToProductId: firstDiscount.productId,
    appliedToProductName: firstDiscount.productName,
    discountAmount: firstDiscount.amountArs,
    pairingReason: firstDiscount.reason,
  };
}

export function calculateComboConfidence(factors: ComboConfidenceFactors): number {
  const score =
    (factors.hasExplicitGroup ? 0.5 : 0) +
    (factors.albumTitleMatch ? 0.3 : 0) +
    (factors.brandConsistency ? 0.1 : 0) +
    (factors.priceRangeConsistency ? 0.1 : 0) +
    (factors.hasMultipleProducts ? 0.2 : 0);

  return Math.min(1, Number(score.toFixed(2)));
}
