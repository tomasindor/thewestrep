import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import { eq } from "drizzle-orm";

import { loadCliEnv } from "@/lib/env/load-cli";
import { getDb } from "@/lib/db/core";
import { brands } from "@/lib/db/schema";

const OUTPUT_DIRECTORY = path.join(process.cwd(), "public", "brand-logos");
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 360;
const MAX_LOGO_WIDTH = 960;
const MAX_LOGO_HEIGHT = 180;
const TRANSPARENCY_THRESHOLD = 10;

type LogoSource =
  | {
      slug: string;
      brandName: string;
      kind: "wikimedia";
      title: string;
    }
  | {
      slug: string;
      brandName: string;
      kind: "local";
      filePath: string;
    };

const BRAND_LOGO_SOURCES: readonly LogoSource[] = [
  { slug: "acne-studios", brandName: "Acne Studios", kind: "wikimedia", title: "File:Acne studios logo, 2021.svg" },
  { slug: "adidas", brandName: "Adidas", kind: "wikimedia", title: "File:Adidas 2022 logo.svg" },
  { slug: "ami", brandName: "Ami", kind: "wikimedia", title: "File:Ami Paris.png" },
  { slug: "ami-paris", brandName: "AMI Paris", kind: "wikimedia", title: "File:Ami Paris.png" },
  { slug: "armani-exchange", brandName: "Armani Exchange", kind: "wikimedia", title: "File:Armani Exchange logo.svg" },
  { slug: "balenciaga", brandName: "Balenciaga", kind: "wikimedia", title: "File:Balenciaga Logo.svg" },
  { slug: "bape", brandName: "Bape", kind: "local", filePath: "public/bape-logo.jpg" },
  { slug: "boss", brandName: "Boss", kind: "wikimedia", title: "File:Boss logo 2021.svg" },
  { slug: "burberry", brandName: "Burberry", kind: "wikimedia", title: "File:Logo Burberry 05.svg" },
  { slug: "calvin-klein", brandName: "Calvin Klein", kind: "wikimedia", title: "File:Calvin klein logo.svg" },
  { slug: "carhartt-wip", brandName: "Carhartt WIP", kind: "wikimedia", title: "File:Carhartt logo.svg" },
  { slug: "chrome-hearts", brandName: "Chrome Hearts", kind: "local", filePath: "public/brand-logos/chrome-hearts.svg" },
  { slug: "corteiz", brandName: "Corteiz", kind: "wikimedia", title: "File:Corteiz-logo.jpg" },
  { slug: "descente", brandName: "Descente", kind: "wikimedia", title: "File:Descente company logo.svg" },
  { slug: "dior", brandName: "Dior", kind: "wikimedia", title: "File:Dior Logo 2022.svg" },
  { slug: "dolce-gabbana", brandName: "Dolce & Gabbana", kind: "wikimedia", title: "File:Dolce & Gabbana - logo (Italy, 1985-).svg" },
  {
    slug: "ermenegildo-zegna",
    brandName: "Ermenegildo Zegna",
    kind: "wikimedia",
    title: "File:Ermenegildo Zegna wordmark (1980–2021).svg",
  },
  { slug: "essentials", brandName: "Essentials", kind: "local", filePath: "public/essentials-logo.jpg" },
  { slug: "essentials-2", brandName: "Essentials", kind: "local", filePath: "public/essentials-logo.jpg" },
  { slug: "gucci", brandName: "Gucci", kind: "wikimedia", title: "File:Gucci logo.svg" },
  { slug: "hellstar", brandName: "Hellstar", kind: "local", filePath: "public/Hellstar-logo.jpg" },
  { slug: "hermes", brandName: "Hermes", kind: "wikimedia", title: "File:Hermes wordmark.svg" },
  { slug: "hugo-boss", brandName: "Hugo Boss", kind: "wikimedia", title: "File:Hugo Boss orange logo.svg" },
  { slug: "lacoste", brandName: "Lacoste", kind: "local", filePath: "public/lacoste-logo.jpg" },
  {
    slug: "louis-vuitton",
    brandName: "Louis Vuitton",
    kind: "wikimedia",
    title: "File:Louis Vuitton logo and wordmark.svg",
  },
  { slug: "lululemon", brandName: "Lululemon", kind: "wikimedia", title: "File:Lululemon Athletica logo.svg" },
  { slug: "moncler", brandName: "Moncler", kind: "local", filePath: "public/brand-logos/moncler.svg" },
  { slug: "new-era", brandName: "New Era", kind: "wikimedia", title: "File:New Era Cap.png" },
  { slug: "nike", brandName: "Nike", kind: "wikimedia", title: "File:Logo NIKE.svg" },
  { slug: "prada", brandName: "Prada", kind: "wikimedia", title: "File:Prada-Logo.svg" },
  { slug: "ralph-lauren", brandName: "Ralph Lauren", kind: "wikimedia", title: "File:Ralph Lauren logo.svg" },
  { slug: "stone-island", brandName: "Stone Island", kind: "wikimedia", title: "File:Stone-Island-Logo.svg" },
  { slug: "stussy", brandName: "Stüssy", kind: "wikimedia", title: "File:Stussy-1.svg" },
] as const;

function getOutputPublicPath(slug: string) {
  return `/brand-logos/${slug}.png`;
}

async function fetchWikimediaAssetUrl(title: string) {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("titles", title);
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");

  const response = await fetch(url, {
    headers: {
      "user-agent": "thewestrep-brand-carousel-logo-sync/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Wikimedia lookup failed with ${response.status}`);
  }

  const payload = (await response.json()) as {
    query?: {
      pages?: Record<string, { imageinfo?: Array<{ url?: string }> }>;
    };
  };
  const pages = Object.values(payload.query?.pages ?? {});
  const imageUrl = pages[0]?.imageinfo?.[0]?.url;

  if (!imageUrl) {
    throw new Error(`Wikimedia did not return an asset URL for ${title}`);
  }

  return imageUrl;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchBufferWithRetry(url: string, label: string, attempts = 4) {
  let lastStatus = 0;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "user-agent": "thewestrep-brand-carousel-logo-sync/1.0",
      },
    });

    if (response.ok) {
      return Buffer.from(await response.arrayBuffer());
    }

    lastStatus = response.status;

    if (response.status !== 429 || attempt === attempts) {
      throw new Error(`Failed to download ${label} (${response.status})`);
    }

    await wait(1000 * attempt);
  }

  throw new Error(`Failed to download ${label} (${lastStatus || "unknown status"})`);
}

async function readSourceBuffer(source: LogoSource) {
  if (source.kind === "local") {
    return readFile(path.join(process.cwd(), source.filePath));
  }

  const assetUrl = await fetchWikimediaAssetUrl(source.title);

  return fetchBufferWithRetry(assetUrl, source.title);
}

async function renderLogoToWhiteTransparentPng(input: Buffer) {
  const flattened = sharp(input, { animated: false }).flatten({ background: "#ffffff" }).trim();
  const { data, info } = await flattened.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const transformed = Buffer.alloc(info.width * info.height * 4);

  for (let index = 0; index < data.length; index += info.channels) {
    const pixelIndex = Math.floor(index / info.channels);
    const outputIndex = pixelIndex * 4;
    const red = data[index] ?? 255;
    const green = data[index + 1] ?? 255;
    const blue = data[index + 2] ?? 255;
    const alpha = info.channels >= 4 ? (data[index + 3] ?? 255) : 255;
    const luminance = Math.round(0.2126 * red + 0.7152 * green + 0.0722 * blue);
    const nextAlpha = Math.max(0, Math.round((alpha * (255 - luminance)) / 255));

    transformed[outputIndex] = 255;
    transformed[outputIndex + 1] = 255;
    transformed[outputIndex + 2] = 255;
    transformed[outputIndex + 3] = nextAlpha < TRANSPARENCY_THRESHOLD ? 0 : nextAlpha;
  }

  const centeredLogo = await sharp(transformed, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize({
      width: MAX_LOGO_WIDTH,
      height: MAX_LOGO_HEIGHT,
      fit: "inside",
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();
  const centeredLogoMetadata = await sharp(centeredLogo).metadata();
  const left = Math.max(0, Math.round((CANVAS_WIDTH - (centeredLogoMetadata.width ?? 0)) / 2));
  const top = Math.max(0, Math.round((CANVAS_HEIGHT - (centeredLogoMetadata.height ?? 0)) / 2));

  return sharp({
    create: {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: centeredLogo, left, top }])
    .png()
    .toBuffer();
}

async function main() {
  const { activeEnvFile } = loadCliEnv();
  const db = getDb();

  if (!db) {
    throw new Error(`DATABASE_URL is required. Put it in ${activeEnvFile ?? ".env.local"} or export it in your shell.`);
  }

  await mkdir(OUTPUT_DIRECTORY, { recursive: true });

  const generated: string[] = [];
  const failed: Array<{ slug: string; reason: string }> = [];

  for (const source of BRAND_LOGO_SOURCES) {
    try {
      const sourceBuffer = await readSourceBuffer(source);
      const preparedLogo = await renderLogoToWhiteTransparentPng(sourceBuffer);
      const publicPath = getOutputPublicPath(source.slug);
      const outputPath = path.join(process.cwd(), "public", publicPath.slice(1));

      await writeFile(outputPath, preparedLogo);
      await db
        .update(brands)
        .set({
          imageUrl: publicPath,
          imageSourceUrl: publicPath,
          imageProvider: null,
          imageAssetKey: null,
          imageAlt: `Logo de ${source.brandName}`,
        })
        .where(eq(brands.slug, source.slug));

      generated.push(source.slug);
      console.log(`✔ ${source.slug} → ${publicPath}`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown error";
      failed.push({ slug: source.slug, reason });
      console.log(`✖ ${source.slug} → ${reason}`);
    }
  }

  console.log(`\nGenerated ${generated.length} logo assets.`);

  if (failed.length > 0) {
    console.log("\nFailures:");
    failed.forEach(({ slug, reason }) => {
      console.log(`- ${slug}: ${reason}`);
    });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unexpected logo sync error.");
  process.exitCode = 1;
});
