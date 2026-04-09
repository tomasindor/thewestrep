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
