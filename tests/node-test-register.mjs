// Node Test Runtime Registration Hook
// This file sets up both tsx and our custom resolver in the correct order
// The key is that our resolver must intercept server-only BEFORE tsx tries to load it
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const projectRoot = pathToFileURL("./");

// Strategy: Create a combined resolver that wraps tsx
// This way, our resolver gets first chance at every import

// First, let's load tsx directly without registering it as a loader
// We'll handle TypeScript files ourselves
// This allows our resolver to intercept server-only

// Register our resolver that handles server-only and delegates to tsx
const resolverPath = pathToFileURL("./tests/node-test-resolver.mjs").href;
register(resolverPath, projectRoot);

console.log("[node-test-register] Custom resolver registered");
