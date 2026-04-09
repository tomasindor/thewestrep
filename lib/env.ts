import "server-only";

export {
  getAdminCredentials,
  getAppUrl,
  getAuthSecret,
  getCustomerGoogleCredentials,
  getMercadoPagoAccessToken,
  getMercadoPagoWebhookUrl,
  getRequiredDatabaseUrl,
  isCustomerGoogleAuthConfigured,
  isDatabaseConfigured,
  isMercadoPagoConfigured,
} from "@/lib/env/shared";
