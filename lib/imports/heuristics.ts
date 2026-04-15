export type ImportHeuristicDecision = "keep" | "auto-reject";
export type ImportHeuristicCategory = "brand" | "showcase" | "sample" | "none";

export interface ImportHeuristicResult {
  decision: ImportHeuristicDecision;
  category: ImportHeuristicCategory;
  reason: string | null;
}

const OBVIOUS_BRAND_PATTERNS = ["brand-logo", "logo-banner", "watermark", "wechat", "whatsapp", "contacto"];
const OBVIOUS_SAMPLE_PATTERNS = ["sample-collage", "sample-only", "fabric-sample", "swatch-only"];
const AMBIGUOUS_SHOWCASE_PATTERNS = ["showcase", "lookbook", "detail", "model"];

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
