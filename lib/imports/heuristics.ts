export type ImportHeuristicDecision = "keep" | "auto-reject";
export type ImportHeuristicCategory = "brand" | "showcase" | "sample" | "none";

export interface ComboInferenceInput {
  albumTitle?: string;
  sourceUrl?: string;
  productData?: Record<string, unknown>;
  productCount?: number;
  detectedPrices?: readonly number[];
}

export interface InferredComboMetadata {
  comboEligible: boolean;
  comboGroup?: string;
  comboPriority?: number;
  comboSourceKey?: string;
  comboScore: number;
}

export interface ImportHeuristicResult {
  decision: ImportHeuristicDecision;
  category: ImportHeuristicCategory;
  reason: string | null;
}

const OBVIOUS_BRAND_PATTERNS = ["brand-logo", "logo-banner", "watermark", "wechat", "whatsapp", "contacto"];
const OBVIOUS_SAMPLE_PATTERNS = ["sample-collage", "sample-only", "fabric-sample", "swatch-only"];
const AMBIGUOUS_SHOWCASE_PATTERNS = ["showcase", "lookbook", "detail", "model"];
const ALBUM_COMBO_KEYWORDS = ["look", "outfit", "set", "combo"];
const SEASON_PATTERNS = [
  /\b(ss|fw)\s*-?\s*(\d{2,4})\b/i,
  /\b(spring|summer|fall|autumn|winter)\s*-?\s*(\d{2,4})\b/i,
  /\b(\d{2,4})\s*-?\s*(spring|summer|fall|autumn|winter)\b/i,
];

function slugifyLoose(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function asTrimmedString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function readExplicitComboGroup(productData?: Record<string, unknown>) {
  if (!productData) {
    return null;
  }

  return (
    asTrimmedString(productData.combo_group)
    ?? asTrimmedString(productData.comboGroup)
    ?? asTrimmedString(productData.look_id)
    ?? asTrimmedString(productData.lookId)
    ?? asTrimmedString(productData.set_id)
    ?? asTrimmedString(productData.setId)
  );
}

function hasAlbumComboMarker(value: string | undefined) {
  if (!value) {
    return false;
  }

  const normalized = value.toLowerCase();
  return ALBUM_COMBO_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function normalizeSeasonToken(season: string, year: string) {
  const normalizedSeason = season.trim().toLowerCase();
  const mappedSeason =
    normalizedSeason === "autumn" ? "fall" : normalizedSeason;
  const yearDigits = year.trim().replace(/\D/g, "");

  if (!mappedSeason || !yearDigits) {
    return null;
  }

  return `${mappedSeason}-${yearDigits}`;
}

function extractSeasonToken(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  for (const pattern of SEASON_PATTERNS) {
    const match = value.match(pattern);

    if (!match) {
      continue;
    }

    const first = match[1]?.trim();
    const second = match[2]?.trim();

    if (!first || !second) {
      continue;
    }

    if (/^\d+$/.test(first)) {
      return normalizeSeasonToken(second, first);
    }

    return normalizeSeasonToken(first, second);
  }

  return null;
}

function readBrandSeasonGroup(input: ComboInferenceInput) {
  const brand = asTrimmedString(input.productData?.brandName ?? input.productData?.brand);
  const seasonToken =
    asTrimmedString(input.productData?.season)
    ?? asTrimmedString(input.productData?.seasonCode)
    ?? asTrimmedString(input.productData?.dropSeason)
    ?? extractSeasonToken(input.albumTitle)
    ?? null;

  if (!brand || !seasonToken) {
    return null;
  }

  return slugifyLoose(`${brand}-${seasonToken}`);
}

function readSourceFallbackGroup(sourceUrl: string | undefined) {
  if (!sourceUrl) {
    return null;
  }

  try {
    const parsed = new URL(sourceUrl);
    const pathTokens = parsed.pathname.split("/").filter(Boolean);
    const albumToken = pathTokens.at(-1) ?? pathTokens.at(-2) ?? "";

    if (!albumToken) {
      return null;
    }

    return slugifyLoose(`${parsed.hostname}-${albumToken}`);
  } catch {
    return null;
  }
}

export function calculateComboConfidence(factors: {
  hasExplicitGroup: boolean;
  albumTitleMatch: boolean;
  brandConsistency: boolean;
  priceRangeConsistency: boolean;
  hasMultipleProducts: boolean;
}) {
  const score =
    (factors.hasExplicitGroup ? 0.5 : 0)
    + (factors.albumTitleMatch ? 0.3 : 0)
    + (factors.brandConsistency ? 0.1 : 0)
    + (factors.priceRangeConsistency ? 0.1 : 0)
    + (factors.hasMultipleProducts ? 0.2 : 0);

  return Math.min(1, Number(score.toFixed(2)));
}

export function inferComboMetadata(input: ComboInferenceInput): InferredComboMetadata {
  const explicitGroup = readExplicitComboGroup(input.productData);
  const albumTitle = input.albumTitle?.trim();
  const hasTwoDetectedPrices = (input.detectedPrices?.length ?? 0) === 2;
  const seasonSignal = extractSeasonToken(albumTitle) ?? extractSeasonToken(asTrimmedString(input.productData?.season));
  const hasAlbumKeyword = hasAlbumComboMarker(albumTitle);
  const albumTitleMatch = hasAlbumKeyword || Boolean(seasonSignal);
  const albumGroup = hasAlbumKeyword && albumTitle ? slugifyLoose(albumTitle) : null;
  const brandSeasonGroup = readBrandSeasonGroup(input);
  const sourceFallbackGroup = hasTwoDetectedPrices ? readSourceFallbackGroup(input.sourceUrl) : null;
  const selectedGroup = explicitGroup ?? albumGroup ?? brandSeasonGroup ?? sourceFallbackGroup;
  const brand = asTrimmedString(input.productData?.brandName ?? input.productData?.brand);
  const price = typeof input.productData?.priceArs === "number" ? input.productData.priceArs : null;
  const score = calculateComboConfidence({
    hasExplicitGroup: Boolean(explicitGroup),
    albumTitleMatch,
    brandConsistency: Boolean(brand),
    priceRangeConsistency: typeof price === "number" && price > 0,
    hasMultipleProducts: (input.productCount ?? 0) > 1,
  });

  const comboEligible = Boolean(selectedGroup) && (hasTwoDetectedPrices || score >= 0.5);

  return {
    comboEligible,
    comboGroup: comboEligible ? selectedGroup ?? undefined : undefined,
    comboPriority: comboEligible ? 0 : undefined,
    comboSourceKey: explicitGroup
      ? "importer-explicit-group"
      : albumGroup
        ? "importer-album-title"
        : brandSeasonGroup
          ? "importer-brand-season"
          : sourceFallbackGroup
            ? "importer-two-prices"
          : undefined,
    comboScore: score,
  };
}

function normalizedCandidate(input: string) {
  try {
    const parsed = new URL(input);
    return `${parsed.hostname}${parsed.pathname}`.toLowerCase();
  } catch {
    return input.toLowerCase();
  }
}

function includesAny(candidate: string, patterns: readonly string[]) {
  return patterns.some((pattern) => candidate.includes(pattern));
}

export function classifyImportImageCandidate(imageUrl: string): ImportHeuristicResult {
  const candidate = normalizedCandidate(imageUrl);

  if (includesAny(candidate, OBVIOUS_BRAND_PATTERNS)) {
    return {
      decision: "auto-reject",
      category: "brand",
      reason: "Obvious brand/showcase asset (logo/banner/contact)",
    };
  }

  if (includesAny(candidate, OBVIOUS_SAMPLE_PATTERNS)) {
    return {
      decision: "auto-reject",
      category: "sample",
      reason: "Obvious sample-only asset",
    };
  }

  if (includesAny(candidate, AMBIGUOUS_SHOWCASE_PATTERNS)) {
    return {
      decision: "keep",
      category: "showcase",
      reason: null,
    };
  }

  return {
    decision: "keep",
    category: "none",
    reason: null,
  };
}
