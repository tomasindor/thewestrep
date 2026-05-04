import { siteConfig } from "@/lib/site";

function readEnv(name: string) {
  const value = process.env[name]?.trim();

  return value ? value : null;
}

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  brandFolder: string;
  productFolder: string;
}

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  endpoint: string;
  publicBaseUrl: string | null;
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

export function getCustomerGoogleCredentials() {
  return {
    clientId: readEnv("GOOGLE_CLIENT_ID"),
    clientSecret: readEnv("GOOGLE_CLIENT_SECRET"),
  };
}

export function isCustomerGoogleAuthConfigured() {
  const credentials = getCustomerGoogleCredentials();

  return Boolean(credentials.clientId && credentials.clientSecret);
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

export function getAppUrl() {
  const configuredUrl = readEnv("NEXTAUTH_URL");

  if (configuredUrl) {
    return configuredUrl;
  }

  const vercelUrl = readEnv("VERCEL_URL");

  if (vercelUrl) {
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
  }

  return siteConfig.url;
}

export function getMercadoPagoAccessToken() {
  return readEnv("MERCADOPAGO_ACCESS_TOKEN");
}

export function getMercadoPagoWebhookUrl() {
  return readEnv("MERCADOPAGO_WEBHOOK_URL");
}

export function isMercadoPagoConfigured() {
  return Boolean(getMercadoPagoAccessToken());
}

/**
 * Alias for isMercadoPagoConfigured for backward compatibility.
 * @deprecated Use isMercadoPagoConfigured instead.
 */
export function isMercadoPagoEnabled() {
  return isMercadoPagoConfigured();
}

export function getMercadoPagoWebhookSecret(): string | null {
  return readEnv("MERCADOPAGO_WEBHOOK_SECRET");
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
    productFolder: readEnv("CLOUDINARY_PRODUCT_FOLDER") ?? "thewestrep/products",
  };
}

export function isCloudinaryConfigured() {
  return getCloudinaryConfig() !== null;
}

export function getR2Config(): R2Config | null {
  const accountId = readEnv("R2_ACCOUNT_ID");
  const accessKeyId = readEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = readEnv("R2_SECRET_ACCESS_KEY");
  const bucketName = readEnv("R2_BUCKET_NAME");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return null;
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    publicBaseUrl: readEnv("R2_PUBLIC_BASE_URL"),
  };
}

export function isR2Configured() {
  return getR2Config() !== null;
}
