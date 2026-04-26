import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

test("aurora background keeps builder-style layered visual contract", () => {
  const auroraSource = fs.readFileSync(path.resolve("./components/ui/aurora-background.tsx"), "utf-8");

  assert.match(auroraSource, /linear-gradient\(180deg,#03050b_0%,#0d1022_38%,#170a2b_68%,#04050c_100%\)/);
  assert.match(auroraSource, /conic-gradient\(from_180deg_at_50%_50%,rgba\(255,255,255,0\.0\)_0deg,rgba\(205,137,255,0\.32\)_115deg,rgba\(123,204,255,0\.2\)_210deg,rgba\(255,255,255,0\.0\)_360deg\)/);
  assert.match(auroraSource, /radial-gradient\(ellipse_at_18%_22%,rgba\(209,136,255,0\.34\)_0%,rgba\(209,136,255,0\)_60%\)/);
  assert.match(auroraSource, /radial-gradient\(ellipse_at_82%_18%,rgba\(118,97,255,0\.3\)_0%,rgba\(118,97,255,0\)_64%\)/);
  assert.match(auroraSource, /mix-blend-screen/);
  assert.match(auroraSource, /repeating-linear-gradient\(0deg,rgba\(255,255,255,0\.065\)_0px,rgba\(255,255,255,0\.065\)_1px,transparent_1px,transparent_48px\)/);
  assert.match(auroraSource, /repeating-linear-gradient\(90deg,rgba\(255,255,255,0\.055\)_0px,rgba\(255,255,255,0\.055\)_1px,transparent_1px,transparent_48px\)/);
  assert.match(auroraSource, /data:image\/svg\+xml/);
  assert.match(auroraSource, /saturate-\[1\.2\]/);
  assert.match(auroraSource, /radial-gradient\(circle_at_50%_50%,rgba\(0,0,0,0\)_54%,rgba\(0,0,0,0\.5\)_100%\)/);
  assert.match(auroraSource, /duration:\s*22/);
  assert.match(auroraSource, /duration:\s*19/);
  assert.match(auroraSource, /duration:\s*21/);
});

test("aurora background keeps minimal integration adaptations", () => {
  const auroraSource = fs.readFileSync(path.resolve("./components/ui/aurora-background.tsx"), "utf-8");

  assert.match(auroraSource, /interface\s+AuroraBackgroundProps\s*\{[\s\S]*children:\s*ReactNode;[\s\S]*className\?:\s*string;/);
  assert.match(auroraSource, /export\s+function\s+AuroraBackground\(\{\s*children,\s*className\s*\}:\s*AuroraBackgroundProps\)/);
  assert.match(auroraSource, /className=\{`relative isolate overflow-hidden saturate-\[1\.2\] \$\{className \?\? ""\}`\}/);
  assert.match(auroraSource, /<div className="relative z-10">\{children\}<\/div>/);
});
