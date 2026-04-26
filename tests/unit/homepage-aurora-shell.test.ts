import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("homepage owns aurora shell so background extends beyond hero", () => {
  const homeSource = fs.readFileSync(path.resolve("./components/marketing/homepage.tsx"), "utf-8");
  const heroPromoSource = fs.readFileSync(path.resolve("./components/marketing/hero-promo.tsx"), "utf-8");
  const homepageCssSource = fs.readFileSync(path.resolve("./components/marketing/homepage.module.css"), "utf-8");

  assert.match(homeSource, /import\s+\{\s*AuroraBackground\s*\}\s+from\s+"@\/components\/ui\/aurora-background";/);
  assert.match(homeSource, /<AuroraBackground\s+className=\{styles\.pageAurora\}>/);
  assert.match(homeSource, /<div\s+className=\{styles\.contentStack\}>/);
  assert.match(homepageCssSource, /\.contentStack\s*>\s*section:not\(#top\)::before/);
  assert.match(homepageCssSource, /opacity:\s*0\.14/);

  assert.doesNotMatch(heroPromoSource, /AuroraBackground/);
});
