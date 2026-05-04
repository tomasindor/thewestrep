import "server-only";

export {
  getAdminCredentials,
  getAppUrl,
  getAuthSecret,
  getCustomerGoogleCredentials,
  getMercadoPagoAccessToken,
  getMercadoPagoWebhookUrl,
  getMercadoPagoWebhookSecret,
  getR2Config,
  getRequiredDatabaseUrl,
  isCustomerGoogleAuthConfigured,
  isDatabaseConfigured,
  isMercadoPagoConfigured,
  isMercadoPagoEnabled,
  isR2Configured,
} from "@/lib/env/shared";
