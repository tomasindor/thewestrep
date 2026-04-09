import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { load } from "cheerio";
import type { Element } from "domhandler";

const SVG_COLOR_ATTRIBUTES = ["fill", "stroke", "color"] as const;
const SVG_SHAPE_TAGS = new Set(["path", "circle", "ellipse", "line", "polygon", "polyline", "rect", "text", "use"]);
const SVG_STYLE_COLOR_PROPERTIES = [...SVG_COLOR_ATTRIBUTES, "stop-color"] as const;
const UNSUPPORTED_TAGS = new Set([
  "animate",
  "animatemotion",
  "animatetransform",
  "discard",
  "feimage",
  "filter",
  "foreignobject",
  "image",
  "lineargradient",
  "marker",
  "mask",
  "meshgradient",
  "metadata",
  "pattern",
  "radialgradient",
  "script",
  "style",
  "symbol",
]);

type TransformOutcome = "written" | "checked" | "skipped" | "failed";

interface CliOptions {
  check: boolean;
  force: boolean;
  inputs: string[];
}

interface ProcessResult {
  filePath: string;
  outcome: TransformOutcome;
  detail: string;
}

function isElementNode(node: unknown): node is Element {
  return node !== null && typeof node === "object" && "tagName" in node;
}

function parseCliOptions(argv: string[]): CliOptions {
  const inputs: string[] = [];
  let check = false;
  let force = false;

  for (const argument of argv) {
    if (argument === "--check") {
      check = true;
      continue;
    }

    if (argument === "--force") {
      force = true;
      continue;
    }

    inputs.push(argument);
  }

  return { check, force, inputs };
}

function normalizeColorValue(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

function isBlackColor(value: string) {
  const normalized = normalizeColorValue(value);

  return normalized === "#000" || normalized === "#000000" || normalized === "black" || normalized === "rgb(0,0,0)" || normalized === "rgba(0,0,0,1)";
}

function isTransparentColor(value: string) {
  const normalized = normalizeColorValue(value);

  return normalized === "none" || normalized === "transparent" || normalized === "rgba(0,0,0,0)";
}

function splitStyleDeclarations(styleValue: string) {
  return styleValue
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf(":");

      return separatorIndex === -1
        ? null
        : {
            property: entry.slice(0, separatorIndex).trim().toLowerCase(),
            value: entry.slice(separatorIndex + 1).trim(),
          };
    })
    .filter((entry): entry is { property: string; value: string } => entry !== null);
}

async function collectSvgFiles(targetPath: string): Promise<string[]> {
  const absolutePath = path.resolve(process.cwd(), targetPath);
  const targetStats = await stat(absolutePath);

  if (targetStats.isFile()) {
    return absolutePath.toLowerCase().endsWith(".svg") ? [absolutePath] : [];
  }

  const entries = await readdir(absolutePath, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map((entry) => collectSvgFiles(path.join(absolutePath, entry.name))),
  );

  return nestedFiles.flat();
}

function getOutputPath(filePath: string) {
  const extension = path.extname(filePath);
  const baseName = filePath.slice(0, -extension.length);

  return `${baseName}-white${extension}`;
}

function ensureTransformableSvg(svgSource: string) {
  const $ = load(svgSource, { xmlMode: true });

  for (const node of $("*").toArray().filter(isElementNode)) {
    const tagName = node.tagName.toLowerCase();

    if (!UNSUPPORTED_TAGS.has(tagName)) {
      continue;
    }

    if (tagName === "style") {
      const styleContents = $(node).text();

      if (!/(^|[^-])(fill|stroke|color)\s*:|stop-color\s*:/i.test(styleContents)) {
        continue;
      }
    }

    throw new Error(`contains unsupported <${tagName}> content`);
  }

  if ($("svg").length === 0) {
    throw new Error("is not a valid SVG document");
  }

  const unsupportedColorAttributes = $("*")
    .toArray()
    .filter(isElementNode)
    .flatMap((node) =>
      SVG_COLOR_ATTRIBUTES.map((attribute) => ({
        attribute,
        value: node.attribs?.[attribute],
        tagName: node.tagName.toLowerCase(),
      })),
    )
    .find(({ value }) => value && !isBlackColor(value) && !isTransparentColor(value) && normalizeColorValue(value) !== "currentcolor");

  if (unsupportedColorAttributes) {
    throw new Error(
      `uses unsupported ${unsupportedColorAttributes.attribute} color '${unsupportedColorAttributes.value}' on <${unsupportedColorAttributes.tagName}>`,
    );
  }

  const unsupportedStyleDeclaration = $("*")
    .toArray()
    .filter(isElementNode)
    .flatMap((node) =>
      splitStyleDeclarations(node.attribs?.style ?? "").map((declaration) => ({
        ...declaration,
        tagName: node.tagName.toLowerCase(),
      })),
    )
    .find(({ property, value }) => {
      if (!SVG_STYLE_COLOR_PROPERTIES.includes(property as (typeof SVG_STYLE_COLOR_PROPERTIES)[number])) {
        return false;
      }

      return !isBlackColor(value) && !isTransparentColor(value) && normalizeColorValue(value) !== "currentcolor";
    });

  if (unsupportedStyleDeclaration) {
    throw new Error(
      `uses unsupported ${unsupportedStyleDeclaration.property} style '${unsupportedStyleDeclaration.value}' on <${unsupportedStyleDeclaration.tagName}>`,
    );
  }

  return $;
}

function transformToWhiteSvg(svgSource: string) {
  const $ = ensureTransformableSvg(svgSource);
  let transformedColorCount = 0;
  let implicitShapeCount = 0;

  $("*").each((_, node) => {
    if (!isElementNode(node)) {
      return;
    }

    const element = $(node);
    const tagName = node.tagName.toLowerCase();

    for (const attribute of SVG_COLOR_ATTRIBUTES) {
      const value = element.attr(attribute);

      if (!value) {
        continue;
      }

      if (isBlackColor(value)) {
        element.attr(attribute, "#ffffff");
        transformedColorCount += 1;
        continue;
      }

      if (normalizeColorValue(value) === "currentcolor" && !element.attr("color")) {
        continue;
      }
    }

    const styleValue = element.attr("style");

    if (styleValue) {
      const nextDeclarations = splitStyleDeclarations(styleValue).map((declaration) => {
        if (!SVG_STYLE_COLOR_PROPERTIES.includes(declaration.property as (typeof SVG_STYLE_COLOR_PROPERTIES)[number])) {
          return declaration;
        }

        return isBlackColor(declaration.value)
          ? { ...declaration, value: "#ffffff" }
          : declaration;
      });

      if (nextDeclarations.length > 0) {
        element.attr(
          "style",
          nextDeclarations.map((declaration) => `${declaration.property}: ${declaration.value}`).join("; "),
        );
      }

      transformedColorCount += nextDeclarations.filter((declaration) => declaration.value === "#ffffff").length;
    }

    if (SVG_SHAPE_TAGS.has(tagName) && !element.attr("fill") && !element.attr("stroke") && !styleValue) {
      implicitShapeCount += 1;
    }
  });

  if (transformedColorCount === 0 && implicitShapeCount === 0) {
    throw new Error("does not expose simple black fill/stroke values to transform safely");
  }

  if (transformedColorCount === 0 && implicitShapeCount > 0) {
    const rootSvg = $("svg").first();
    rootSvg.attr("fill", "#ffffff");
  }

  return $.xml();
}

async function processSvg(filePath: string, options: CliOptions): Promise<ProcessResult> {
  if (filePath.toLowerCase().endsWith("-white.svg")) {
    return {
      filePath,
      outcome: "skipped",
      detail: "already a white variant",
    };
  }

  const outputPath = getOutputPath(filePath);
  const relativeInputPath = path.relative(process.cwd(), filePath);
  const relativeOutputPath = path.relative(process.cwd(), outputPath);

  try {
    if (!options.force) {
      try {
        await stat(outputPath);
        return {
          filePath: relativeInputPath,
          outcome: "skipped",
          detail: `target already exists (${relativeOutputPath}) — use --force to overwrite`,
        };
      } catch {
        // File does not exist yet, continue.
      }
    }

    const svgSource = await readFile(filePath, "utf8");
    const whiteSvg = transformToWhiteSvg(svgSource);

    if (options.check) {
      return {
        filePath: relativeInputPath,
        outcome: "checked",
        detail: `can generate ${relativeOutputPath}`,
      };
    }

    await writeFile(outputPath, whiteSvg, "utf8");

    return {
      filePath: relativeInputPath,
      outcome: "written",
      detail: `generated ${relativeOutputPath}`,
    };
  } catch (error) {
    return {
      filePath: relativeInputPath,
      outcome: "skipped",
      detail: error instanceof Error ? error.message : "unknown transform error",
    };
  }
}

function printUsage() {
  console.log("Usage: npm run logos:white -- [--check] [--force] [file-or-directory ...]");
}

async function main() {
  const options = parseCliOptions(process.argv.slice(2));
  const targets = options.inputs.length > 0 ? options.inputs : ["public"];

  if (targets.some((target) => target === "--help" || target === "-h")) {
    printUsage();
    return;
  }

  const collectedFiles = await Promise.all(
    targets.map(async (target) => {
      try {
        return await collectSvgFiles(target);
      } catch (error) {
        console.log(`- ${target}: ${error instanceof Error ? error.message : "could not read target"}`);
        return [];
      }
    }),
  );
  const svgFiles = Array.from(new Set(collectedFiles.flat())).sort((left, right) => left.localeCompare(right));

  if (svgFiles.length === 0) {
    console.log("No SVG files found.");
    return;
  }

  const results = await Promise.all(svgFiles.map((filePath) => processSvg(filePath, options)));
  const summary = results.reduce(
    (accumulator, result) => {
      accumulator[result.outcome] += 1;
      return accumulator;
    },
    { written: 0, checked: 0, skipped: 0, failed: 0 },
  );

  for (const result of results) {
    const prefix = result.outcome === "written" ? "✔" : result.outcome === "checked" ? "◌" : result.outcome === "failed" ? "✖" : "-";
    console.log(`${prefix} ${result.filePath}: ${result.detail}`);
  }

  console.log(
    `Summary: ${summary.written} written, ${summary.checked} check-only, ${summary.skipped} skipped${summary.failed ? `, ${summary.failed} failed` : ""}.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Unexpected logo generation error.");
  process.exitCode = 1;
});
