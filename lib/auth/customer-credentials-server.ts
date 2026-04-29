import "server-only";

import { hashCustomerPassword, verifyCustomerPassword } from "@/lib/auth/customer-password";

export async function hashCustomerCredentialPassword(password: string) {
  return hashCustomerPassword(password);
}

export async function verifyCustomerCredentialPassword(password: string, passwordHash: string) {
  return verifyCustomerPassword(password, passwordHash);
}
