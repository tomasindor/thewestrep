/**
 * Script para importar productos desde Yupoo a la base de datos.
 * 
 * Uso: npx tsx scripts/import-yupoo.ts
 * Limitar páginas: npx tsx scripts/import-yupoo.ts --pages=1
 * Limitar productos: npx tsx scripts/import-yupoo.ts --pages=1 --limit=10
 */

import * as cheerio from "cheerio";
import { getDb } from "@/lib/db/core";
import { brands, categories } from "@/lib/db/schema";
import { createId, slugify } from "@/lib/utils";
import { loadCliEnv } from "@/lib/env/load-cli";
import { canonicalizeYupooImageCandidates, getYupooCanonicalKey } from "@/lib/yupoo-core";
import { buildBulkIngestionInput, ingestYupooSource } from "@/lib/imports/ingestion";
import { createBulkIngestionDependencies } from "@/lib/imports/bulk-r2-wiring";

// =====================================================
// MAPA DE MARCAS CAMUFLADAS → NOMBRES REALES
// =====================================================
const BRAND_DECODER: [string, string][] = [
  // LARGAS PRIMERO (para que se matcheen antes que las cortas)
  ["C⭐⭐OME HE⭐⭐TS", "Chrome Hearts"],
  ["D⭐LC⭐ GA⭐⭐A⭐A", "Dolce & Gabbana"],
  ["A⭐⭐X⭐⭐⭐ER W⭐⭐G", "Alexander Wang"],
  ["A⭐⭐X⭐⭐⭐ER", "Alexander Wang"],
  ["WE11 ⭐⭐NE", "We11done"],
  ["WE11⭐⭐NE", "We11done"],
  ["G⭐C⭐I", "Gucci"],
  ["B⭐R⭐E⭐RY", "Burberry"],
  ["C⭐L⭐⭐N ⭐L⭐IN", "Calvin Klein"],
  ["B⭐L⭐⭐⭐IA⭐A", "Balenciaga"],
  ["H⭐G⭐ B⭐⭐S", "Hugo Boss"],
  ["A⭐I⭐AS", "Adidas"],
  ["D⭐S⭐E⭐T⭐", "Descente"],
  ["SA⭐N⭐ VA⭐IT⭐", "Saint Vanity"],
  ["RA⭐⭐H LA⭐RE⭐", "Ralph Lauren"],
  ["M⭐⭐⭐D EM⭐⭐ION", "Mixed Emotion"],
  ["P⭐A⭐A", "Prada"],
  ["N⭐K⭐", "Nike"],
  ["D⭐O⭐", "Dior"],
  ["M⭐⭐⭐⭐⭐R", "Moncler"],
  ["V⭐LL⭐Y", "Valley"],
  ["H⭐R⭐⭐S", "Hermes"],
  ["D⭐⭐CHUT⭐E", "Dershutze"],
  ["H⭐⭐G⭐ B⭐⭐S", "Hugo Boss"],
  ["P⭐⭐DA", "Prada"],
  ["D⭐⭐LC⭐", "Dolce"],
  ["B⭐⭐BERRY", "Burberry"],
  ["L⭐⭐IS", "Louis"],
  
  // L⭐ variants (Louis Vuitton o Lanvin)
  ["L⭐ VUITTON", "Louis Vuitton"],
  ["L⭐NVI⭐N", "Lanvin"],
  ["L⭐", "Louis Vuitton"], // fallback para L⭐ solo
  
  // Marcas adicionales detectadas
  ["STONE ISLAND", "Stone Island"],
  ["S⭐⭐⭐E I⭐⭐A⭐ND", "Stone Island"],
  ["S⭐⭐⭐⭐E I⭐⭐LAND", "Stone Island"],
  ["ARMANI EXCHANGE", "Armani Exchange"],
  ["AR⭐⭐⭐ EXCH⭐⭐⭐", "Armani Exchange"],
  ["LACOSTE", "Lacoste"],
  ["BROKEN PLANET", "Broken Planet"],
  ["GO⭐S⭐E⭐D", "Gosha Rubchinskiy"],
  ["ESSENTIALS", "Essentials"],
  ["E⭐P⭐R⭐⭐ A⭐M⭐N⭐", "Essentials"],
  ["FEAR OF GOD ESSENTIALS", "Essentials"],
  ["B⭐⭐S", "Boss"],
  
  // Marcas sin camuflaje - streetwear y contemporary
  ["FEAR OF GOD", "Fear of God"],
  ["FOG ", "Fear of God"],
  ["GALLERY DEPT", "Gallery Department"],
  ["GRAILZ", "Grailz"],
  ["GALLERY DEPARTMENT", "Gallery Department"],
  ["TRAVIS SCOTT", "Travis Scott"],
  ["OFF-WHITE", "Off-White"],
  ["PALM ANGELS", "Palm Angels"],
  ["STONE ISLAND", "Stone Island"],
  ["CANADA GOOSE", "Canada Goose"],
  ["MAISON MARGIELA", "Maison Margiela"],
  ["TOM FORD", "Tom Ford"],
  ["KARL LAGERFELD", "Karl Lagerfeld"],
  ["TOMMY HILFIGER", "Tommy Hilfiger"],
  ["POLO RALPH LAUREN", "Polo Ralph Lauren"],
  ["POLO RALPH", "Polo Ralph Lauren"],
  ["RALPH LAUREN", "Ralph Lauren"],
  ["HUMAN MADE", "Human Made"],
  ["YOHJI YAMAMOTO", "Yohji Yamamoto"],
  ["Y-3", "Y-3"],
  ["BOTTEGA VENETA", "Bottega Veneta"],
  ["ERMENEGILDO ZEGNA", "Ermenegildo Zegna"],
  ["ZEGNA", "Ermenegildo Zegna"],
  ["DSQUARED2", "Dsquared2"],
  ["MIU MIU", "Miu Miu"],
  ["JACQUEMUS", "Jacquemus"],
  ["ACNE STUDIOS", "Acne Studios"],
  ["DENIM TEARS", "Denim Tears"],
  ["RICK OWENS", "Rick Owens"],
  ["UNDERCOVER", "Undercover"],
  ["NEIGHBORHOOD", "Neighborhood"],
  ["PAUL SMITH", "Paul Smith"],
  ["TED BAKER", "Ted Baker"],
  ["THOM BROWNE", "Thom Browne"],
  ["FRAGMENT DESIGN", "Fragment Design"],
  ["MM6 MAISON", "MM6"],
  ["STUSSY", "Stussy"],
  ["HELLSTAR", "Hellstar"],
  ["VETEMENTS", "Vetements"],
  ["RHUDE", "Rhude"],
  ["DIESEL", "Diesel"],
  ["SP5DER", "Sp5der"],
  ["LULULEMON", "Lululemon"],
  ["CORTEIZ", "Corteiz"],
  ["CASABLANCA", "Casablanca"],
  ["ESSENTIALS", "Essentials"],
  ["KENZO", "Kenzo"],
  ["MOSCHINO", "Moschino"],
  ["VALENTINO", "Valentino"],
  ["VERSACE", "Versace"],
  ["FENDI", "Fendi"],
  ["GIVENCHY", "Givenchy"],
  ["LOEWE", "Loewe"],
  ["SACAI", "Sacai"],
  ["BALMAIN", "Balmain"],
  ["MARNI", "Marni"],
  ["CARHARTT", "Carhartt"],
  ["WTAPS", "Wtaps"],
  ["AMBUSH", "Ambush"],
  ["BAPE", "Bape"],
  ["DREW", "Drew"],
  ["AMI", "AMI Paris"],
  ["ON ", "On"],
  ["ON RUNNING", "On Running"],
  ["TOPSHOP", "Topshop"],
];

// =====================================================
// TIPOS DE PRENDA → CATEGORÍAS EN ESPAÑOL
// =====================================================
const GARMENT_TYPES: [string, string][] = [
  // LARGAS PRIMERO
  ["LONG SLEEVED", "Remeras"],
  ["LONG SLEEVE", "Remeras"],
  ["SHORT SLEEVE", "Remeras"],
  ["TRENCH COAT", "Camperas"],
  ["T-SHIRT", "Remeras"],
  ["T SHIRT", "Remeras"],
  ["POLO", "Polos"],
  ["HOODIE", "Buzos"],
  ["HOODIES", "Buzos"],
  ["SWEATSHIRT", "Buzos"],
  ["SWEATER", "Buzos"],
  ["PULLOVER", "Buzos"],
  ["ZIP UP", "Buzos"],
  ["ZIP-UP", "Buzos"],
  ["JACKET", "Camperas"],
  ["COAT", "Camperas"],
  ["PARKA", "Camperas"],
  ["VEST", "Camperas"],
  ["TROUSERS", "Pantalones"],
  ["PANTS", "Pantalones"],
  ["JEANS", "Pantalones"],
  ["JEAN", "Pantalones"],
  ["SHORTS", "Shorts"],
  ["BERMUDA", "Shorts"],
  ["HAT", "Gorros"],
  ["CAP", "Gorros"],
  ["BEANIE", "Gorros"],
  ["SNAPBACK", "Gorros"],
  ["SHIRT", "Camisas"],
  ["UNDERWEAR", "Ropa Interior"],
  ["BOXER", "Ropa Interior"],
  ["TRUNKS", "Ropa Interior"],
  ["BAG", "Bags & Accesorios"],
  ["BELT", "Bags & Accesorios"],
  ["WALLET", "Bags & Accesorios"],
  ["TOTE", "Bags & Accesorios"],
  ["BACKPACK", "Bags & Accesorios"],
  ["SET", "Sets"],
  ["TRACKSUIT", "Sets"],
  ["TEE", "Remeras"],
];

// =====================================================
// YUPOO IMAGE EXTRACTION
// =====================================================
const STAR_CHARS = /[⭐★☆✦✧✪✫✬✭✮✯✰✱✲✳✴✵✶✷✸✹✺✻✼✽✾✿*•·﹡]/g;
const CJK_CHAR_REGEX = /[\u3400-\u9fff]/u;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function containsCjk(value: string) {
  return CJK_CHAR_REGEX.test(value);
}

function uniqueStrings(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
  }

  return result;
}

function extractBalancedValueBlock(source: string, key: string, openChar?: "{" | "["): string | null {
  const keyIndex = source.indexOf(key);
  if (keyIndex === -1) return null;

  const searchStart = keyIndex + key.length;
  const resolvedOpenChar = openChar
    ?? (source.slice(searchStart).match(/[\[{]/)?.[0] as "{" | "[" | undefined);

  if (!resolvedOpenChar) return null;

  const start = source.indexOf(resolvedOpenChar, searchStart);
  if (start === -1) return null;

  const closeChar = resolvedOpenChar === "{" ? "}" : "]";

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = start; index < source.length; index++) {
    const char = source[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === "\\") {
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === resolvedOpenChar) depth++;
    if (char === closeChar) {
      depth--;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  return null;
}

function extractBalancedJsonBlock(source: string, key: string) {
  return extractBalancedValueBlock(source, key, "{");
}

function normalizeObfuscatedText(value: string) {
  return normalizeSpaces(
    decodeHtmlEntities(value)
      .normalize("NFKC")
      .replace(STAR_CHARS, "*")
      .replace(/[“”‘’]/g, '"')
      .toUpperCase(),
  );
}

function buildObfuscatedBrandRegex(pattern: string) {
  const normalized = normalizeObfuscatedText(pattern);
  let regexSource = "";

  for (const char of normalized) {
    if (char === "*") {
      regexSource += `${STAR_CHARS.source}+`;
      continue;
    }

    if (/\s/.test(char)) {
      regexSource += `[\\s._-]*`;
      continue;
    }

    regexSource += escapeRegex(char);
  }

  return new RegExp(regexSource, "i");
}

function normalizeSizeLabel(value: string) {
  return normalizeSpaces(
    decodeHtmlEntities(value)
      .normalize("NFKC")
      .replace(/[（(][^）)]*[）)]/g, " ")
      .replace(/[【】\[\]]/g, " ")
      .replace(/[，,]/g, " ")
      .toUpperCase(),
  );
}

function normalizeImageUrl(value: string | undefined | null) {
  const n = value?.trim();
  if (!n || n.startsWith("data:")) return null;
  if (n.startsWith("//")) return `https:${n}`;
  if (n.startsWith("/")) return null;
  if (!/^https?:\/\//i.test(n)) return null;
  return n.replace(/^http:/i, "https:");
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; thewestrep-bot/1.0)" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Fetch error ${response.status} for ${url}`);
  }

  return response.text();
}

function isLikelyProductImage(url: string) {
  const lower = url.toLowerCase();
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "photo.yupoo.com") return false;
    if (!/\.(jpg|jpeg|png|webp)$/i.test(parsed.pathname)) return false;
  } catch { return false; }
  // Incluir丈量图片 (imágenes de medidas) también
  return !["avatar", "logo", "icon", "sprite", "blank.gif"].some((f) => lower.includes(f));
}

function shouldPushImageToEnd(url: string) {
  const lower = url.toLowerCase();
  const fileName = lower.split("/").at(-1) ?? "";
  const measurePatterns = [
    /numeros/i,
    /measure/i,
    /size/i,
    /丈量/i,
    /measurement/i,
    /talla/i,
    /尺寸/i,
    /尺码/i,
    /sizechart/i,
    /chart/i,
  ];

  return /\.png$/i.test(lower)
    || measurePatterns.some((pattern) => pattern.test(lower))
    || /^((small|medium|big|original)\.(png|webp))$/i.test(fileName);
}

function extractWeidianUrlFromAlbumHtml(html: string) {
  const $ = cheerio.load(html);

  const hrefs = $("a[href]")
    .map((_, el) => $(el).attr("href") ?? "")
    .get();

  const candidates = [
    ...hrefs,
    ...(html.match(/https?:\/\/x\.yupoo\.com\/external\?[^"'\s<]+/gi) ?? []),
    ...(html.match(/https?:\/\/(?:www\.)?weidian\.com\/item\.html\?[^"'\s<]+/gi) ?? []),
  ];

  for (const rawCandidate of candidates) {
    const normalizedCandidate = decodeHtmlEntities(rawCandidate);

    if (/x\.yupoo\.com\/external/i.test(normalizedCandidate)) {
      try {
        const externalUrl = new URL(normalizedCandidate);
        const embedded = externalUrl.searchParams.get("url");
        if (!embedded) continue;

        const decoded = decodeURIComponent(decodeURIComponent(embedded));
        if (/weidian\.com\/item\.html/i.test(decoded)) return decoded;
      } catch {
        continue;
      }
    }

    if (/weidian\.com\/item\.html/i.test(normalizedCandidate)) {
      return normalizedCandidate;
    }
  }

  return null;
}

function extractYupooAlbumDataFromHtml(sourceUrl: string, html: string) {
  const $ = cheerio.load(html);
  const collected: string[] = [];

  const pushCandidate = (value: string | undefined | null) => {
    const normalized = normalizeImageUrl(value);
    if (normalized && isLikelyProductImage(normalized)) collected.push(normalized);
  };

  // 1. IMAGEN DE PREVIEW (la que está en .showalbumheader__gallerycover)
  //    Esta es la imagen principal del producto, va PRIMERO siempre
  const previewSrc = $(".showalbumheader__gallerycover img").first().attr("src");
  const previewImage = previewSrc ? normalizeImageUrl(previewSrc) : null;

  // 2. Recolectar todas las imágenes de la galería
  for (const attr of ["data-origin-src", "data-src", "src"]) {
    $(".showalbum__children img, img.image__img, img.autocover").each((_, el) => {
      pushCandidate($(el).attr(attr));
    });
  }

  // También buscar en HTML
  for (const match of html.match(/https?:\/\/photo\.yupoo\.com\/[^"'\s)]+\.(?:jpg|jpeg|png|webp)/gi) ?? []) {
    pushCandidate(match);
  }

// 3. Deduplicar variantes (small/big/medium/original) manteniendo una por familia
const deduped = canonicalizeYupooImageCandidates(collected);

// 4. Construir array ordenado: preview → regulares → PNG/medidas
const images: string[] = [];
const usedUrls = new Set<string>();
const MAX_IMAGES = 30;

if (previewImage) {
const previewKey = getYupooCanonicalKey(previewImage);
const bestPreview = deduped.find((url) => {
try {
return getYupooCanonicalKey(url) === previewKey;
} catch {
return false;
}
}) ?? previewImage;

images.push(bestPreview);
usedUrls.add(bestPreview);
}

const remaining = deduped.filter((url) => !usedUrls.has(url));
const regular = remaining.filter((url) => !shouldPushImageToEnd(url));
const trailing = remaining.filter((url) => shouldPushImageToEnd(url));

// Limitar a 30 imágenes en total (incluyendo preview)
const availableSlots = MAX_IMAGES - images.length;
const regularLimited = regular.slice(0, Math.max(0, availableSlots - Math.min(trailing.length, availableSlots)));
const trailingLimited = trailing.slice(0, Math.max(0, availableSlots - regularLimited.length));

images.push(...regularLimited, ...trailingLimited);

  const weidianUrl = extractWeidianUrlFromAlbumHtml(html);

  if (images.length === 0) throw new Error("No se encontraron imágenes.");

  return { sourceUrl, images, weidianUrl, html };
}

async function extractYupooAlbumData(sourceUrl: string) {
  if (!/yupoo\.com/i.test(sourceUrl)) throw new Error("La URL debe pertenecer a Yupoo.");

  const html = await fetchText(sourceUrl);
  return extractYupooAlbumDataFromHtml(sourceUrl, html);
}

// =====================================================
// DECODIFICADOR DE MARCAS Y NOMBRES
// =====================================================

const BRAND_PATTERNS = BRAND_DECODER
  .map(([camouflaged, real]) => ({
    brand: real,
    pattern: camouflaged,
    regex: buildObfuscatedBrandRegex(camouflaged),
    score: normalizeObfuscatedText(camouflaged).replace(/[^A-Z0-9\u3400-\u9fff]/g, "").length,
  }))
  .sort((a, b) => b.score - a.score);

function decodeBrandFromTitle(title: string): { brand: string; remaining: string } {
  for (const candidate of BRAND_PATTERNS) {
    const match = candidate.regex.exec(title);
    if (!match || match.index === undefined) continue;

    let remaining = title.slice(0, match.index) + title.slice(match.index + match[0].length);
    remaining = normalizeSpaces(remaining.replace(/^[\s,.-]+|[\s,.-]+$/g, ""));
    return { brand: candidate.brand, remaining };
  }

  return { brand: "Otros", remaining: title };
}

function detectGarmentType(title: string): string {
  const upperTitle = title.toUpperCase();
  
  for (const [type, category] of GARMENT_TYPES) {
    if (upperTitle.includes(type.toUpperCase())) {
      return category;
    }
  }
  
  return "Varios";
}

function cleanProductName(title: string): string {
  let name = decodeHtmlEntities(title).normalize("NFKC");
  
  // 1. Remover todo lo que está entre paréntesis/corchetes chinos
  name = name.replace(/[（(][^）)]*[）)]/g, "").trim();
  name = name.replace(/\[[^\]]*\]/g, "").trim();
  
  // 2. Remover precios (￥XX / ¥XX)
  name = name.replace(/(?:TOP\s+)?[¥￥]\s*\d+/gi, "").trim();
  name = name.replace(/(?:SHORTS\s+)?[¥￥]\s*\d+/gi, "").trim();
  name = name.replace(/[¥￥]\s*\d+/g, "").trim();
  
  // 3. Remover códigos de producto (8-12 dígitos)
  name = name.replace(/\s+\d{8,12}\s*/g, " ").trim();
  name = name.replace(/\b\d{5,7}[A-Z]?\b/g, " ").trim();

  // 4. Remover tipos de prenda en inglés (ya los tenemos en categoría)
  for (const [type] of GARMENT_TYPES) {
    name = name.replace(new RegExp(`\\b${type}\\b`, "gi"), "").trim();
  }
  
  // 5. Remover palabras sueltas que no aportan
  name = name.replace(/\b(TOP|SHORTS|WITH|AND|FOR|IN|THE|A|AN)\b/gi, "").trim();
  name = name.replace(STAR_CHARS, " ").trim();
  name = name.replace(/\b[A-Z]{1,4}\b/g, " ").trim();
  
  // 6. Limpiar espacios dobles y caracteres extraños
  name = name.replace(/[|｜]+/g, " ").trim();
  name = name.replace(/[_/]+/g, " ").trim();
  name = name.replace(/\s+/g, " ").trim();
  name = name.replace(/^[\s,.\-]+|[\s,.\-]+$/g, "").trim();
  
  const alnum = name.replace(/[^\p{L}\p{N}]+/gu, "");

  // 7. Si quedó vacío, muy corto o es puro residuo numérico, usar fallback Marca + Categoría
  if (!name || name.length < 2 || /^\d+$/.test(alnum) || alnum.length < 3) {
    return "";
  }
  
  // 8. Capitalizar
  name = name.charAt(0).toUpperCase() + name.slice(1);
  
  return name;
}

// =====================================================
// TRADUCCIÓN DE COLORES (Chino/Inglés → Español)
// =====================================================
const COLOR_TRANSLATIONS: Array<[string, string]> = [
  ["米白色", "Blanco roto"],
  ["奶白色", "Blanco crema"],
  ["象牙白", "Blanco marfil"],
  ["藏青色", "Azul marino"],
  ["深灰色", "Gris oscuro"],
  ["浅灰色", "Gris claro"],
  ["浅蓝色", "Azul claro"],
  ["深蓝色", "Azul oscuro"],
  ["军绿色", "Verde militar"],
  ["军绿", "Verde militar"],
  ["卡其色", "Caqui"],
  ["卡其", "Caqui"],
  ["咖啡色", "Café"],
  ["咖啡", "Café"],
  ["宝蓝", "Azul eléctrico"],
  ["雾蓝", "Azul humo"],
  ["蓝灰", "Gris azulado"],
  ["白灰", "Gris claro"],
  ["杏色", "Albaricoque"],
  ["杏黄", "Amarillo albaricoque"],
  ["黑色", "Negro"],
  ["白色", "Blanco"],
  ["红色", "Rojo"],
  ["蓝色", "Azul"],
  ["绿色", "Verde"],
  ["粉色", "Rosa"],
  ["灰色", "Gris"],
  ["黄色", "Amarillo"],
  ["紫色", "Morado"],
  ["棕色", "Marrón"],
  ["橙色", "Naranja"],
  ["深蓝", "Azul oscuro"],
  ["浅蓝", "Azul claro"],
  ["深紫", "Morado oscuro"],
  ["蓝", "Azul"],
  ["白", "Blanco"],
  ["黑", "Negro"],
  ["红", "Rojo"],
  ["灰", "Gris"],
  ["粉", "Rosa"],
  ["绿", "Verde"],
  ["黄", "Amarillo"],
  ["紫", "Morado"],
  ["棕", "Marrón"],
  ["橙", "Naranja"],
  ["light blue", "Azul claro"],
  ["dark blue", "Azul oscuro"],
  ["light grey", "Gris claro"],
  ["light gray", "Gris claro"],
  ["dark grey", "Gris oscuro"],
  ["dark gray", "Gris oscuro"],
  ["navy blue", "Azul marino"],
  ["navy", "Azul marino"],
  ["black", "Negro"],
  ["white", "Blanco"],
  ["red", "Rojo"],
  ["blue", "Azul"],
  ["green", "Verde"],
  ["pink", "Rosa"],
  ["apricot", "Albaricoque"],
  ["gray", "Gris"],
  ["grey", "Gris"],
  ["yellow", "Amarillo"],
  ["purple", "Morado"],
  ["brown", "Marrón"],
  ["orange", "Naranja"],
  ["beige", "Beige"],
  ["cream", "Crema"],
  ["khaki", "Caqui"],
  ["olive", "Oliva"],
  ["denim", "Denim"],
  ["jeans", "Denim"],
];

const VARIANT_NOISE_PATTERNS = [
  /一双|两双|三双|四双|五双|一套|两套|三套/g,
  /(?:颜色|顏色|color|colour|尺码|尺寸|size)[:：]?/gi,
  /(?:现货|新款|同款|升级款|经典款|版型|编号|编码|款式|spot|instock)/gi,
  /(?:选择|请选择|select|option|specification|sku)[:：]?/gi,
  /[【】\[\]（）()]/g,
];

const COLOR_WORD_PATTERNS: Array<[RegExp, string]> = COLOR_TRANSLATIONS
  .slice()
  .sort((a, b) => b[0].length - a[0].length)
  .map(([source, target]) => {
    if (/[a-z]/i.test(source)) {
      return [new RegExp(`\\b${escapeRegex(source)}\\b`, "gi"), target] as [RegExp, string];
    }

    return [new RegExp(escapeRegex(source), "g"), target] as [RegExp, string];
  });

function replaceKnownTranslations(value: string) {
  let result = value;

  for (const [pattern, target] of COLOR_WORD_PATTERNS) {
    result = result.replace(pattern, target);
  }

  return result;
}

function cleanupVariantNoise(value: string) {
  let result = decodeHtmlEntities(value).normalize("NFKC");

  for (const pattern of VARIANT_NOISE_PATTERNS) {
    result = result.replace(pattern, " ");
  }

  result = result
    .replace(/\b(?:[A-Z]{1,6}\d{1,8}[A-Z]{0,4}|\d{1,8}[A-Z]{1,6})\b/gi, " ")
    .replace(/\b\d{2,8}[A-Z]{0,3}\b/gi, " ")
    .replace(/([A-Za-z\u00C0-\u024F]+)\d{2,8}\b/g, "$1 ")
    .replace(/[;；|｜]+/g, " / ")
    .replace(/[,+]+/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s*\/\s*/g, " / ");

  return normalizeSpaces(result);
}

function titleCaseSpanishLabel(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((token) => {
      if (/^(XS|S|M|L|XL|XXL|XXXL|XXS)$/i.test(token)) return token.toUpperCase();
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(" ");
}

function translateColor(colorStr: string): string {
  const cleaned = cleanupVariantNoise(colorStr);
  if (!cleaned) return "";

  const translated = replaceKnownTranslations(cleaned)
    .replace(/[\u3400-\u9fff]+/gu, " ")
    .replace(/\b(?:colou?r|size|尺码|尺寸|颜色|顏色)\b/gi, " ")
    .replace(/\b(?:big|small|medium|large)\b/gi, " ")
    .replace(/\s*\/\s*/g, " / ");

  const segments = uniqueStrings(
    translated
      .split("/")
      .map((segment) => normalizeSpaces(segment))
      .map((segment) => segment.replace(/\b[A-Z]{1,3}\b/g, (token) => {
        const upper = token.toUpperCase();
        return ["XS", "S", "M", "L", "XL", "XXL", "XXXL"].includes(upper) ? upper : " ";
      }))
      .map((segment) => normalizeSpaces(segment.replace(/\b\d{1,8}\b/g, " ")))
      .filter(Boolean),
  );

  const result = normalizeSpaces(segments.join(" / "));
  if (result) {
    return result
      .split(" / ")
      .map((segment) => titleCaseSpanishLabel(segment))
      .join(" / ");
  }

  const fallback = normalizeSpaces(cleaned.replace(/[\u3400-\u9fff]+/gu, " "));
  return titleCaseSpanishLabel(fallback || cleaned);
}

async function fetchWeidianSizesAndVariants(weidianUrl: string): Promise<{ sizes: string[]; variants: string[] }> {
  try {
    const html = decodeHtmlEntities(await fetchText(weidianUrl));

    const skuPropertiesBlock = extractBalancedJsonBlock(html, '"sku_properties":');
    const attrListBlock = extractBalancedValueBlock(html, '"attr_list":', "[");
    const skuBlock = extractBalancedJsonBlock(html, '"sku":');

    const skuProperties = (skuPropertiesBlock
      ? JSON.parse(skuPropertiesBlock)
      : {
          attr_list: attrListBlock ? JSON.parse(attrListBlock) : [],
          sku: skuBlock ? JSON.parse(skuBlock) : {},
        }) as {
      attr_list?: Array<{ attr_title?: string; attr_values?: Array<{ attr_value?: string }> }>;
      sku?: Record<string, { title?: string }>;
    };

    if (!skuProperties.attr_list?.length && !Object.keys(skuProperties.sku ?? {}).length) {
      return { sizes: [], variants: [] };
    }

    const sizes: string[] = [];
    const variants: string[] = [];
    const isSizeTitle = (value: string) => /^(尺码|尺寸|size|sizes|eu size|us size)$/i.test(normalizeSpaces(value));
    const isColorTitle = (value: string) => /^(颜色|顏色|color|colour|款式|颜色分类|配色)$/i.test(normalizeSpaces(value));

    for (const attribute of skuProperties.attr_list ?? []) {
      const title = normalizeSpaces(attribute.attr_title ?? "");
      const values = uniqueStrings((attribute.attr_values ?? []).map((entry) => entry.attr_value ?? ""));

      if (isSizeTitle(title)) {
        sizes.push(...values.map(normalizeSizeLabel).filter(Boolean));
        continue;
      }

        const normalizedVariants = values
          .map((value) => (isColorTitle(title) || containsCjk(value) ? translateColor(value) : titleCaseSpanishLabel(normalizeSpaces(value))))
          .filter(Boolean);

      variants.push(...normalizedVariants);
    }

    if ((sizes.length === 0 || variants.length === 0) && skuProperties.sku) {
      for (const sku of Object.values(skuProperties.sku)) {
        const fragments = uniqueStrings((sku.title ?? "").split(/[;；/｜|,，]+/).map((part) => normalizeSpaces(part)));

        for (const fragment of fragments) {
          const normalizedSize = normalizeSizeLabel(fragment);
          if (/^(XS|S|M|L|XL|XXL|XXXL|\d{2,3})$/.test(normalizedSize)) {
            sizes.push(normalizedSize);
            continue;
          }

            const variant = containsCjk(fragment) ? translateColor(fragment) : titleCaseSpanishLabel(fragment);
            if (variant) variants.push(variant);
          }
        }
    }

    return {
      sizes: uniqueStrings(sizes),
      variants: uniqueStrings(variants),
    };
  } catch {
    return { sizes: [], variants: [] };
  }
}

// =====================================================

const YUPOO_BASE = "https://deateath.x.yupoo.com";
const CATEGORIES_URL = `${YUPOO_BASE}/categories`;
const UID = "1";
const BATCH_SIZE = 3; // Reducido para evitar rate limits
const DELAY_MS = 800;

interface ScrapedAlbum {
  title: string;
  href: string;
  albumId: string;
  price: number | null;
  rawName: string;
}

function parseAlbumFromTitle(title: string): { rawName: string; price: number | null } {
  // Extraer primer precio del título
  const priceMatch = title.match(/￥\s*(\d+)/);
  const price = priceMatch ? parseInt(priceMatch[1], 10) : null;
  return { rawName: title, price };
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapePage(page: number): Promise<ScrapedAlbum[]> {
  const url = `${CATEGORIES_URL}?uid=${UID}&page=${page}`;
  const response = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; thewestrep-bot/1.0)" },
    cache: "no-store",
  });
  if (!response.ok) return [];

  const html = await response.text();
  const $ = cheerio.load(html);
  const albums: ScrapedAlbum[] = [];

  $("a.album__main").each((_, element) => {
    const title = $(element).attr("title")?.trim();
    const href = $(element).attr("href")?.trim();
    if (!title || !href) return;
    
    const albumIdMatch = href.match(/\/albums\/(\d+)/);
    if (!albumIdMatch) return;

    albums.push({ 
      title, 
      href, 
      albumId: albumIdMatch[1], 
      ...parseAlbumFromTitle(title) 
    });
  });

  return albums;
}

async function getTotalPages(): Promise<number> {
  const response = await fetch(`${CATEGORIES_URL}?uid=${UID}`, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; thewestrep-bot/1.0)" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Fetch error: ${response.status}`);

  const html = await response.text();
  const $ = cheerio.load(html);
  const match = $(".categories__box-right-pagination-span").text().match(/\d+\s*\/\s*(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
}

// Cache de marcas y categorías para no hacer queries repetidas
const brandCache = new Map<string, { id: string; name: string }>();
const categoryCache = new Map<string, { id: string; name: string }>();

async function findOrCreateBrand(db: NonNullable<ReturnType<typeof getDb>>, brandName: string) {
  const key = brandName.toLowerCase();
  if (brandCache.has(key)) return brandCache.get(key)!;

  const allBrands = await db.select().from(brands);
  const existing = allBrands.find(b => b.name.toLowerCase() === key);
  
  if (existing) {
    brandCache.set(key, existing);
    return existing;
  }

  const id = createId("brand");
  const slug = slugify(brandName);
  await db.insert(brands).values({ id, name: brandName, slug, imageAlt: "" });
  const newBrand = { id, name: brandName, slug };
  brandCache.set(key, newBrand);
  return newBrand;
}

async function findOrCreateCategory(db: NonNullable<ReturnType<typeof getDb>>, categoryName: string) {
  const key = categoryName.toLowerCase();
  if (categoryCache.has(key)) return categoryCache.get(key)!;

  const allCategories = await db.select().from(categories);
  const existing = allCategories.find(c => c.name.toLowerCase() === key);
  
  if (existing) {
    categoryCache.set(key, existing);
    return existing;
  }

  const id = createId("category");
  const slug = slugify(categoryName);
  await db.insert(categories).values({
    id, name: categoryName, slug,
    description: `Productos - ${categoryName}`,
    imageAlt: "",
  });
  const newCat = { id, name: categoryName, slug };
  categoryCache.set(key, newCat);
  return newCat;
}

async function processAlbum(
  album: ScrapedAlbum,
  db: NonNullable<ReturnType<typeof getDb>>,
): Promise<{ success: boolean; error?: string; brand?: string; category?: string }> {
  try {
    // 1. Decodificar marca
    const { brand: brandName, remaining } = decodeBrandFromTitle(album.title);
    
    // 2. Limpiar nombre y detectar tipo
    const cleanedName = cleanProductName(remaining);
    const garmentType = detectGarmentType(album.title);
    
    // Si el nombre quedó vacío, usar "Marca + Categoría"
    const productName = cleanedName || `${brandName} ${garmentType}`;

    // 3. Extraer imágenes
    const albumSlug = album.href.split("?")[0];
    const albumUrl = `${YUPOO_BASE}${albumSlug}?uid=1`;
    const albumData = await extractYupooAlbumData(albumUrl);

    if (albumData.images.length === 0) {
      return { success: false, error: "Sin imágenes" };
    }

    // 4. Extraer link de Weidian y obtener talles/variantes
    let sizes: string[] = [];
    let variants: string[] = [];

    if (albumData.weidianUrl) {
      const weidianData = await fetchWeidianSizesAndVariants(albumData.weidianUrl);
      sizes = weidianData.sizes;
      variants = weidianData.variants;
    }

    // 5. Normalizar datos económicos/base para staging
    const slug = `${slugify(productName)}-${album.albumId}`;
    const priceYuan = album.price ?? 0;
    const priceArs = priceYuan > 0 ? priceYuan * 200 + 50000 : 0;

    // 6. Ingestar a staging (shared pipeline)
    const ingestionInput = buildBulkIngestionInput({
      albumUrl,
      albumHref: album.href,
      imageUrls: albumData.images,
      productData: {
        albumId: album.albumId,
        rawName: album.rawName,
        productName,
        slug,
        brandName,
        categoryName: garmentType,
        sourceUrl: albumUrl,
        weidianUrl: albumData.weidianUrl,
        sizes,
        variants,
        priceYuan,
        priceArs,
      },
    });

    await ingestYupooSource(ingestionInput, createBulkIngestionDependencies(db));

    return { success: true, brand: brandName, category: garmentType };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown",
    };
  }
}

async function main() {
  const { activeEnvFile } = loadCliEnv();
  const db = getDb();

  if (!db) {
    throw new Error(`DATABASE_URL required. Put it in ${activeEnvFile ?? ".env.local"}`);
  }

  console.log("🚀 Importación Yupoo → thewestrep\n");
  console.log("💰 Precio: (yuan × 200) + 50,000 ARS");
  console.log("🖼️  Imágenes: principal primero, medidas al final\n");

  const totalAvailablePages = await getTotalPages();
  const pagesArg = process.argv.find((arg) => arg.startsWith("--pages="));
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const maxPages = pagesArg ? parseInt(pagesArg.split("=")[1], 10) : totalAvailablePages;
  const maxProducts = limitArg ? parseInt(limitArg.split("=")[1], 10) : null;
  const totalPages = Math.min(maxPages, totalAvailablePages);

  console.log(`📄 Páginas: ${totalPages}/${totalAvailablePages}\n`);

  // Scrapear
  const allAlbums: ScrapedAlbum[] = [];
  const seenAlbumIds = new Set<string>();

  for (let page = 1; page <= totalPages; page++) {
    const albums = await scrapePage(page);
    for (const album of albums) {
      if (!seenAlbumIds.has(album.albumId)) {
        seenAlbumIds.add(album.albumId);
        allAlbums.push(album);
      }
    }
    if (page % 50 === 0 || page === totalPages) {
      console.log(`📖 Scraped: ${page}/${totalPages} (${allAlbums.length} álbumes)`);
    }
    if (page < totalPages) await sleep(150);
  }

  console.log(`\n✅ ${allAlbums.length} álbumes únicos\n`);

  // Filtrar
  const albumesValidos = allAlbums.filter((album) => {
    const t = album.title.toLowerCase();
    const esInfo = t.includes("whatsapp") || t.includes("contact") || t.includes("info");
    const esCategoria = t.includes("🔥brand") || t.includes("🔥sale") || t.includes("hot selling");
    const esCalzado = ["sneaker", "shoe", "jordan", "dunk", "air force", "yeezy", "boot", "slide", 
      "sandal", "shoes", "footwear", "runner", "trainer", "af1"].some(x => t.includes(x));
    return !esInfo && !esCategoria && !esCalzado && album.title.length > 5;
  });

  const albumesAImportar = maxProducts && Number.isFinite(maxProducts)
    ? albumesValidos.slice(0, Math.max(0, maxProducts))
    : albumesValidos;

  console.log(`📋 Para importar: ${albumesAImportar.length}${maxProducts ? ` (limitado a ${albumesAImportar.length})` : ""}\n`);

  // Procesar
  let ok = 0, err = 0;
  const brandCounts = new Map<string, number>();
  const errors: Array<{ album: string; error: string }> = [];

  for (let i = 0; i < albumesAImportar.length; i += BATCH_SIZE) {
    const batch = albumesAImportar.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(batch.map(album => processAlbum(album, db)));

    for (let j = 0; j < results.length; j++) {
      if (results[j].success) {
        ok++;
        const b = results[j].brand || "Desconocido";
        brandCounts.set(b, (brandCounts.get(b) || 0) + 1);
      } else {
        err++;
        errors.push({ album: batch[j].rawName.slice(0, 50), error: results[j].error ?? "?" });
      }
    }

    const progress = Math.min(i + BATCH_SIZE, albumesAImportar.length);
    console.log(`⚙️  ${progress}/${albumesAImportar.length} - ✅ ${ok} - ❌ ${err}`);

    if (i + BATCH_SIZE < albumesAImportar.length) await sleep(DELAY_MS);
  }

  // Resumen por marca
  console.log(`\n${"=".repeat(50)}`);
  console.log(`📊 MARCAS IMPORTADAS`);
  console.log(`${"=".repeat(50)}`);
  const sorted = [...brandCounts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [brand, count] of sorted) {
    console.log(`   ${brand}: ${count}`);
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`✅ Importados: ${ok} | ❌ Errores: ${err}`);
  console.log(`${"=".repeat(50)}`);

  if (errors.length > 0) {
    console.log(`\n⚠️  Errores:`);
    errors.slice(0, 15).forEach(({ album, error }) => {
      console.log(`   - ${album}... → ${error}`);
    });
  }

  console.log(`\n💡 Estado: draft | Revisar en /admin/products\n`);
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
