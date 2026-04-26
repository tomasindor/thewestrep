import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("shadergradient dependencies are declared for react/next integration", () => {
  const packageJsonSource = fs.readFileSync(path.resolve("./package.json"), "utf-8");

  assert.match(packageJsonSource, /"@shadergradient\/react"\s*:\s*"[^"]+"/);
  assert.match(packageJsonSource, /"@react-three\/fiber"\s*:\s*"[^"]+"/);
  assert.match(packageJsonSource, /"three"\s*:\s*"[^"]+"/);
  assert.match(packageJsonSource, /"three-stdlib"\s*:\s*"[^"]+"/);
  assert.match(packageJsonSource, /"camera-controls"\s*:\s*"[^"]+"/);
  assert.match(packageJsonSource, /"@types\/three"\s*:\s*"[^"]+"/);
});

test("hero shader background wrapper keeps configured shader props and lightweight layering", () => {
  const shaderSource = fs.readFileSync(
    path.resolve("./components/marketing/hero-promo-shader-background.tsx"),
    "utf-8",
  );

  assert.match(shaderSource, /"use client"/);
  assert.match(shaderSource, /import\s*\{\s*ShaderGradientCanvas\s*,\s*ShaderGradient\s*\}\s*from\s*"@shadergradient\/react"/);
  assert.match(shaderSource, /type="waterPlane"/);
  assert.match(shaderSource, /axesHelper="off"/);
  assert.match(shaderSource, /cDistance=\{4\.39\}/);
  assert.match(shaderSource, /cPolarAngle=\{70\}/);
  assert.match(shaderSource, /color1="#ff24af"/);
  assert.match(shaderSource, /color2="#9e1fff"/);
  assert.match(shaderSource, /color3="#00006c"/);
  assert.match(shaderSource, /uSpeed=\{0\.2\}/);
  assert.match(shaderSource, /uStrength=\{2\.3\}/);
  assert.match(shaderSource, /className="pointer-events-none absolute inset-0 z-0 overflow-hidden"/);
});

test("hero promo composes shadergradient only as background layer and keeps existing carousel/copy flow", () => {
  const heroSource = fs.readFileSync(path.resolve("./components/marketing/hero-promo.tsx"), "utf-8");

  assert.match(
    heroSource,
    /import\s+\{\s*HeroPromoShaderBackground\s*\}\s+from\s+"@\/components\/marketing\/hero-promo-shader-background";/,
  );
  assert.match(heroSource, /<HeroPromoShaderBackground\s*\/>/);
  assert.match(heroSource, /<HeroPromoCarousel/);
  assert.match(heroSource, /renderContract\.headline/);
});
