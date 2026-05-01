/**
 * Node Test Custom Resolver Hook
 * 
 * This ESM resolve hook provides narrow test-only support for:
 * - @/ path aliases → absolute paths
 * - Extensionless relative TS imports → .ts or /index.ts
 * - server-only shim → no-op (allows tests to run)
 * 
 * This resolver is intentionally MINIMAL and TEST-ONLY.
 * It does NOT rewrite unrelated specifiers or hide real resolution errors.
 * 
 * WARNING: Test-only. Do NOT use in production.
 */
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const projectRoot = process.cwd();

/**
 * Resolves @/ aliases to absolute paths
 */
function resolveAlias(specifier) {
  if (specifier.startsWith("@/")) {
    const relativePath = specifier.slice(2); // Remove @/
    const absolutePath = path.join(projectRoot, relativePath);
    
    if (fs.existsSync(absolutePath + ".ts")) {
      return absolutePath + ".ts";
    }

    if (fs.existsSync(absolutePath)) {
      const stat = fs.statSync(absolutePath);
      if (stat.isDirectory()) {
        return path.join(absolutePath, "index.ts");
      }
      return absolutePath;
    }
  }
  return null;
}

/**
 * Handles extensionless relative imports
 */
function resolveExtensionless(specifier, parentPath) {
  if (!specifier.startsWith(".")) {
    return null;
  }
  
  const resolved = path.resolve(path.dirname(parentPath), specifier);
  
  if (fs.existsSync(resolved)) {
    const stat = fs.statSync(resolved);
    if (stat.isDirectory()) {
      return path.join(resolved, "index.ts");
    }
    return resolved;
  }
  
  if (fs.existsSync(resolved + ".ts")) {
    return resolved + ".ts";
  }
  
  return null;
}

/**
 * Get server-only stub source
 */
function getServerOnlyStubSource() {
  return `// server-only shim for tests - empty module
export default {};`;
}

/**
 * Main resolve hook - MUST shortCircuit or call nextResolve
 */
export async function resolve(specifier, context, nextResolve) {
  // Handle server-only shim - intercept BEFORE Node tries to resolve
  if (specifier === "server-only" || specifier.startsWith("server-only/")) {
    // Return data URL with stub content - short circuit the chain
    return {
      shortCircuit: true,
      url: `data:text/javascript,${encodeURIComponent(getServerOnlyStubSource())}`,
      format: "module",
    };
  }
  
  // Handle @/ path aliases
  const aliasResolved = resolveAlias(specifier);
  if (aliasResolved) {
    return nextResolve(pathToFileURL(aliasResolved).href, context);
  }
  
  // Handle extensionless relative imports
  const parentPath = context.parentURL 
    ? fileURLToPath(context.parentURL) 
    : path.join(projectRoot, "tests");
  
  const extensionResolved = resolveExtensionless(specifier, parentPath);
  if (extensionResolved) {
    return nextResolve(pathToFileURL(extensionResolved).href, context);
  }
  
  // Pass to next resolver for tsx to handle TypeScript
  return nextResolve(specifier, context);
}
