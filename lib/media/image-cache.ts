import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";

/**
 * Cache local de imágenes en el servidor.
 * Las imágenes se guardan en /public/img-cache/ y se sirven desde ahí
 * cuando ya fueron descargadas, evitando requests repetidos a Yupoo.
 * 
 * Esto protege contra:
 * - Rate limiting de Yupoo
 * - Lentitud de red
 * - Yupoo caído temporalmente
 */

const CACHE_DIR = path.join(process.cwd(), "public", "img-cache");
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días
const MAX_CACHE_SIZE_MB = 500; // 500MB máximo

function hashUrl(url: string): string {
  return createHash("md5").update(url).digest("hex");
}

function getCachePath(sourceUrl: string): string {
  const hash = hashUrl(sourceUrl);
  // Usar subdirectorios para no tener miles de archivos en una carpeta
  const subdir = hash.slice(0, 2);
  return path.join(CACHE_DIR, subdir, `${hash}.img`);
}

function getMetadataPath(cachePath: string): string {
  return cachePath.replace(".img", ".meta.json");
}

interface CacheMetadata {
  sourceUrl: string;
  cachedAt: number;
  contentType: string;
  size: number;
}

export async function getCachedImage(sourceUrl: string): Promise<Buffer | null> {
  const cachePath = getCachePath(sourceUrl);
  const metaPath = getMetadataPath(cachePath);

  try {
    const [imgData, metaRaw] = await Promise.all([
      readFile(cachePath),
      readFile(metaPath, "utf-8"),
    ]);

    const meta: CacheMetadata = JSON.parse(metaRaw);

    // Verificar si expiró
    if (Date.now() - meta.cachedAt > CACHE_MAX_AGE_MS) {
      return null; // Expirado, necesita refetch
    }

    return imgData;
  } catch {
    return null; // No está en cache
  }
}

export async function saveImageToCache(
  sourceUrl: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  const cachePath = getCachePath(sourceUrl);
  const metaPath = getMetadataPath(cachePath);
  const dir = path.dirname(cachePath);

  try {
    await mkdir(dir, { recursive: true });

    const meta: CacheMetadata = {
      sourceUrl,
      cachedAt: Date.now(),
      contentType,
      size: buffer.length,
    };

    await Promise.all([
      writeFile(cachePath, buffer),
      writeFile(metaPath, JSON.stringify(meta)),
    ]);
  } catch (error) {
    // Silently fail - cache es best-effort
    console.warn("Failed to cache image:", sourceUrl, error);
  }
}

export function isCacheExpired(meta: CacheMetadata): boolean {
  return Date.now() - meta.cachedAt > CACHE_MAX_AGE_MS;
}

export async function getCacheStats(): Promise<{
  fileCount: number;
  totalSizeMB: number;
  oldestEntry: number | null;
}> {
  try {
    const { readdir } = await import("node:fs/promises");
    const subdirs = await readdir(CACHE_DIR);
    
    let fileCount = 0;
    let totalSize = 0;
    let oldestEntry: number | null = null;

    for (const subdir of subdirs) {
      const dirPath = path.join(CACHE_DIR, subdir);
      try {
        const files = await readdir(dirPath);
        for (const file of files) {
          if (file.endsWith(".img")) {
            fileCount++;
            const filePath = path.join(dirPath, file);
            const stats = await stat(filePath);
            totalSize += stats.size;

            // Intentar leer metadata para fecha
            try {
              const metaPath = filePath.replace(".img", ".meta.json");
              const metaRaw = await readFile(metaPath, "utf-8");
              const meta: CacheMetadata = JSON.parse(metaRaw);
              if (!oldestEntry || meta.cachedAt < oldestEntry) {
                oldestEntry = meta.cachedAt;
              }
            } catch {}
          }
        }
      } catch {}
    }

    return {
      fileCount,
      totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
      oldestEntry,
    };
  } catch {
    return { fileCount: 0, totalSizeMB: 0, oldestEntry: null };
  }
}
