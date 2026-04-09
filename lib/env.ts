import "server-only";

export {
  getAdminCredentials,
  getAppUrl,
  getAuthSecret,
  getCustomerGoogleCredentials,
  getMercadoPagoAccessToken,
  getMercadoPagoWebhookUrl,
  getR2Config,
  getRequiredDatabaseUrl,
  isCustomerGoogleAuthConfigured,
  isDatabaseConfigured,
  isMercadoPagoConfigured,
  isR2Configured,
} from "@/lib/env/shared";
