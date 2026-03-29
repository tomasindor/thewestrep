function readEnv(name: string) {
  const value = process.env[name]?.trim();

  return value ? value : null;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  brandFolder: string;
}

export function getAuthSecret() {
  return readEnv("AUTH_SECRET") ?? readEnv("NEXTAUTH_SECRET");
}

export function getAdminCredentials() {
  return {
    username: readEnv("ADMIN_USERNAME"),
    password: readEnv("ADMIN_PASSWORD"),
  };
}

export function isDatabaseConfigured() {
  return Boolean(readEnv("DATABASE_URL"));
}

export function getRequiredDatabaseUrl() {
  const databaseUrl = readEnv("DATABASE_URL");

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to use the database layer.");
  }

  return databaseUrl;
}

export function getCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = readEnv("CLOUDINARY_CLOUD_NAME");
  const apiKey = readEnv("CLOUDINARY_API_KEY");
  const apiSecret = readEnv("CLOUDINARY_API_SECRET");

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  return {
    cloudName,
    apiKey,
    apiSecret,
    brandFolder: readEnv("CLOUDINARY_BRAND_FOLDER") ?? "thewestrep/brands",
  };
}

export function isCloudinaryConfigured() {
  return getCloudinaryConfig() !== null;
}
