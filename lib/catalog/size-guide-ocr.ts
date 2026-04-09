import type { ProductSizeGuideRow } from "@/lib/catalog/types";
import { DEFAULT_PRODUCT_SIZE_GUIDE_COLUMNS } from "@/lib/catalog/size-guides";
import { buildRemoteImageProxyUrl, shouldProxyRemoteImage } from "@/lib/media/remote-image-proxy";

interface ParseProductSizeGuideOcrTextOptions {
  fallbackColumns?: readonly string[];
  preferredRowLabels?: readonly string[];
}

export interface ParsedProductSizeGuideOcrDraft {
  columns: string[];
  rows: ProductSizeGuideRow[];
  unitLabel?: string;
  warnings: string[];
  rawText: string;
}

const HEADER_TOKEN_IGNORE = new Set(["size", "sizes", "talle", "talles", "medida", "medidas"]);
const SIZE_LABEL_PATTERN = /^(?:XXXS|XXS|XS|S|M|L|XL|XXL|XXXL|XXXXL|FREE|OS|TU|U|UNICO|ÚNICO|ONE\s+SIZE|\d{2,3})$/i;
const MEASUREMENT_VALUE_PATTERN = /\d+(?:[.,]\d+)?/g;

const COLUMN_ALIASES: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /(?:^|\b)(length|largo|longitud|衣长|着丈)(?:\b|$)/i, label: "Largo" },
  { pattern: /(?:^|\b)(chest|bust|pecho|busto|胸围)(?:\b|$)/i, label: "Pecho" },
  { pattern: /(?:^|\b)(shoulder|hombro|hombros|肩宽)(?:\b|$)/i, label: "Hombros" },
  { pattern: /(?:^|\b)(sleeve|manga|mangas|袖长)(?:\b|$)/i, label: "Mangas" },
  { pattern: /(?:^|\b)(waist|cintura|腰围)(?:\b|$)/i, label: "Cintura" },
  { pattern: /(?:^|\b)(hips?|cadera|臀围)(?:\b|$)/i, label: "Cadera" },
  { pattern: /(?:^|\b)(hem|dobladillo|下摆)(?:\b|$)/i, label: "Botamanga" },
  { pattern: /(?:^|\b)(thigh|muslo|腿围)(?:\b|$)/i, label: "Muslo" },
  { pattern: /(?:^|\b)(inseam|entrepierna)(?:\b|$)/i, label: "Entrepierna" },
  { pattern: /(?:^|\b)(rise|tiro)(?:\b|$)/i, label: "Tiro" },
];

function compactValue(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function normalizeLine(value: string) {
  return value
    .replace(/[|¦•·]/g, " ")
    .replace(/[：:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLabelToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "")
    .toUpperCase();
}

function looksLikeMeasurementToken(token: string) {
  return /^\d+(?:[.,]\d+)?(?:cm)?$/i.test(token);
}

function extractMeasurementValues(line: string) {
  return Array.from(line.matchAll(MEASUREMENT_VALUE_PATTERN), (match) => match[0].replace(",", "."));
}

function extractUnitLabel(text: string) {
  if (/\bcm\b|centimet/i.test(text)) {
    return "cm";
  }

  if (/\bin\b|inch|pulgad/i.test(text)) {
    return "in";
  }

  return undefined;
}

function dedupeColumns(columns: readonly string[]) {
  return Array.from(new Set(columns.map(compactValue).filter(Boolean)));
}

function canonicalizeColumnLabel(token: string) {
  const normalizedToken = compactValue(token);

  if (!normalizedToken) {
    return "";
  }

  const alias = COLUMN_ALIASES.find(({ pattern }) => pattern.test(normalizedToken));

  if (alias) {
    return alias.label;
  }

  return normalizedToken.charAt(0).toUpperCase() + normalizedToken.slice(1).toLowerCase();
}

function tokenizeHeaderLine(line: string) {
  return line
    .split(/\s+/)
    .map(compactValue)
    .filter((token) => token && !HEADER_TOKEN_IGNORE.has(token.toLowerCase()) && !looksLikeMeasurementToken(token))
    .map(canonicalizeColumnLabel);
}

function findPreferredLabel(line: string, preferredRowLabels: readonly string[]) {
  const normalizedLine = normalizeLabelToken(line);

  return preferredRowLabels.find((label) => {
    const normalizedLabel = normalizeLabelToken(label);
    return normalizedLabel && normalizedLine.includes(normalizedLabel);
  });
}

function extractRowLabel(line: string, preferredRowLabels: readonly string[]) {
  const preferredLabel = findPreferredLabel(line, preferredRowLabels);

  if (preferredLabel) {
    return preferredLabel;
  }

  const normalizedLine = normalizeLine(line);
  const tokens = normalizedLine.split(/\s+/).filter(Boolean);
  const firstToken = tokens[0];

  if (firstToken && SIZE_LABEL_PATTERN.test(firstToken.toUpperCase())) {
    return firstToken.toUpperCase();
  }

  const firstTwoTokens = tokens.slice(0, 2).join(" ");

  if (firstTwoTokens && SIZE_LABEL_PATTERN.test(firstTwoTokens.toUpperCase())) {
    return firstTwoTokens.toUpperCase();
  }

  const labelCandidate = compactValue(line.replace(MEASUREMENT_VALUE_PATTERN, " ").split(/\s{2,}/)[0] ?? "");

  if (labelCandidate && /[A-Za-z\d]/.test(labelCandidate)) {
    return labelCandidate.toUpperCase();
  }

  return "";
}

function buildRowsFromLines(lines: readonly string[], columns: readonly string[], preferredRowLabels: readonly string[]) {
  const rows: ProductSizeGuideRow[] = [];
  const maxValues = Math.max(columns.length, 1);

  lines.forEach((line) => {
    const values = extractMeasurementValues(line);

    if (values.length === 0) {
      return;
    }

    const label = extractRowLabel(line, preferredRowLabels);

    if (!label) {
      return;
    }

    rows.push({
      label,
      values: Array.from({ length: maxValues }, (_, index) => values[index] ?? ""),
    });
  });

  return rows;
}

function inferColumnsFromText(lines: readonly string[], fallbackColumns: readonly string[]) {
  const headerColumns = dedupeColumns(
    lines.flatMap((line) => {
      if (!/[A-Za-z\u00C0-\u024F\u4E00-\u9FFF]/.test(line)) {
        return [];
      }

      const aliasMatches = COLUMN_ALIASES.filter(({ pattern }) => pattern.test(line)).map(({ label }) => label);

      if (aliasMatches.length > 0) {
        return aliasMatches;
      }

      const tokens = tokenizeHeaderLine(line);
      return tokens.length >= 2 ? tokens : [];
    }),
  );

  if (headerColumns.length > 0) {
    return headerColumns;
  }

  const maxMeasurements = lines.reduce((max, line) => Math.max(max, extractMeasurementValues(line).length), 0);

  if (maxMeasurements > 0) {
    const baseColumns = fallbackColumns.length > 0 ? fallbackColumns : DEFAULT_PRODUCT_SIZE_GUIDE_COLUMNS;
    return Array.from({ length: maxMeasurements }, (_, index) => baseColumns[index] ?? `Medida ${index + 1}`);
  }

  return [...fallbackColumns];
}

function normalizeRows(rows: readonly ProductSizeGuideRow[], preferredRowLabels: readonly string[]) {
  const dedupedRows = Array.from(
    new Map(rows.map((row) => [normalizeLabelToken(row.label), row] as const)).values(),
  ).filter((row) => compactValue(row.label) && row.values.some((value) => compactValue(value)));

  if (preferredRowLabels.length === 0) {
    return dedupedRows;
  }

  const order = new Map(preferredRowLabels.map((label, index) => [normalizeLabelToken(label), index] as const));

  return dedupedRows.sort((left, right) => {
    const leftOrder = order.get(normalizeLabelToken(left.label)) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = order.get(normalizeLabelToken(right.label)) ?? Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return left.label.localeCompare(right.label, "es");
  });
}

export function buildSizeGuideOcrImageUrl(url: string) {
  return shouldProxyRemoteImage(url) ? buildRemoteImageProxyUrl(url) : url;
}

export function parseProductSizeGuideOcrText(
  rawText: string,
  options: ParseProductSizeGuideOcrTextOptions = {},
): ParsedProductSizeGuideOcrDraft {
  const fallbackColumns = dedupeColumns(options.fallbackColumns ?? DEFAULT_PRODUCT_SIZE_GUIDE_COLUMNS);
  const preferredRowLabels = Array.from(new Set((options.preferredRowLabels ?? []).map(compactValue).filter(Boolean)));
  const normalizedLines = rawText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);
  const columns = inferColumnsFromText(normalizedLines, fallbackColumns);
  const rows = normalizeRows(buildRowsFromLines(normalizedLines, columns, preferredRowLabels), preferredRowLabels);
  const warnings: string[] = [];

  if (rows.length === 0) {
    warnings.push("No encontramos filas confiables en el OCR. Revisá el texto crudo o completá la tabla manualmente.");
  }

  if (columns.length === 0) {
    warnings.push("No pudimos inferir columnas. Dejamos la estructura lista para que la completes a mano.");
  }

  if (rows.length > 0 && columns.length !== rows[0]?.values.length) {
    warnings.push("Algunas filas no tenían la misma cantidad de valores. Ajustamos la grilla automáticamente.");
  }

  return {
    columns,
    rows,
    unitLabel: extractUnitLabel(rawText),
    warnings,
    rawText,
  };
}
