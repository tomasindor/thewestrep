export type PriceValidationResult =
  | { valid: true; price: number }
  | { valid: false; reason: "missing-price"; message: string };

export type ImportPriceResolution =
  | { valid: true; prices: number[]; primaryPrice: number }
  | { valid: false; reason: "missing-price"; message: string };

function toPositiveNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = Number(
      value
        .replace(/\s+/g, "")
        .replace(/\.(?=\d{3}(?:\D|$))/g, "")
        .replace(/,/g, ".")
        .trim(),
    );
    if (Number.isFinite(normalized) && normalized > 0) {
      return normalized;
    }
  }

  return null;
}

function collectNumbersFromUnknown(input: unknown): number[] {
  if (Array.isArray(input)) {
    return input.flatMap((entry) => collectNumbersFromUnknown(entry));
  }

  if (typeof input === "object" && input) {
    return Object.values(input as Record<string, unknown>).flatMap((entry) => collectNumbersFromUnknown(entry));
  }

  if (typeof input === "string") {
    const matches = input.match(/\d[\d.,]{2,}/g) ?? [];
    return matches
      .map((candidate) => toPositiveNumber(candidate))
      .filter((candidate): candidate is number => candidate !== null);
  }

  const resolved = toPositiveNumber(input);
  return resolved === null ? [] : [resolved];
}

const PRICE_COLLECTION_KEYS = [
  "detectedPrices",
  "detectedPriceArs",
  "prices",
  "priceList",
  "finalPrices",
  "comboPrices",
  "pricePair",
  "priceRange",
] as const;

export function resolveImportPrices(productData: Record<string, unknown> | null | undefined): ImportPriceResolution {
  const candidate = productData ?? {};

  const byPrecedence = [candidate.finalPrice, candidate.priceArs, candidate.price]
    .map((entry) => toPositiveNumber(entry))
    .filter((entry): entry is number => entry !== null)
    .map((value) => Math.round(value));

  const discovered: number[] = [];

  for (const key of PRICE_COLLECTION_KEYS) {
    discovered.push(...collectNumbersFromUnknown(candidate[key]).map((value) => Math.round(value)));
  }

  for (const [key, value] of Object.entries(candidate)) {
    if (!/price|precio/i.test(key)) {
      continue;
    }

    discovered.push(...collectNumbersFromUnknown(value).map((entry) => Math.round(entry)));
  }

  const ordered = [...byPrecedence, ...discovered].filter((value) => value > 0);
  const unique: number[] = [];

  for (const price of ordered) {
    if (!unique.includes(price)) {
      unique.push(price);
    }
  }

  const primaryPrice = unique[0];

  if (!primaryPrice) {
    return {
      valid: false,
      reason: "missing-price",
      message: "El producto no tiene precio válido. Se omite antes de staging.",
    };
  }

  return {
    valid: true,
    prices: unique,
    primaryPrice,
  };
}

export function validateImportPrice(productData: Record<string, unknown> | null | undefined): PriceValidationResult {
  const resolved = resolveImportPrices(productData);

  if (!resolved.valid) {
    return resolved;
  }

  return {
    valid: true,
    price: Math.round(resolved.primaryPrice),
  };
}
