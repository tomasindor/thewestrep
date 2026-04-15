export type PriceValidationResult =
  | { valid: true; price: number }
  | { valid: false; reason: "missing-price"; message: string };

function toPositiveNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = Number(value.replace(/,/g, ".").trim());
    if (Number.isFinite(normalized) && normalized > 0) {
      return normalized;
    }
  }

  return null;
}

export function validateImportPrice(productData: Record<string, unknown> | null | undefined): PriceValidationResult {
  const candidate = productData ?? {};
  const resolved = toPositiveNumber(candidate.finalPrice)
    ?? toPositiveNumber(candidate.priceArs)
    ?? toPositiveNumber(candidate.price);

  if (resolved === null) {
    return {
      valid: false,
      reason: "missing-price",
      message: "El producto no tiene precio válido. Se omite antes de staging.",
    };
  }

  return {
    valid: true,
    price: Math.round(resolved),
  };
}
