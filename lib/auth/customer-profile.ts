import "server-only";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { CustomerAuthConfigurationError } from "@/lib/auth/customer-accounts";
import {
  buildCustomerProfileShippingSummary,
  deriveCustomerNameParts,
  deriveStreetAddressParts,
  normalizeCustomerFullName,
  normalizeStreetAddressLine,
} from "@/lib/auth/customer-profile-fields";
import { getDb } from "@/lib/db/core";
import { customerAccounts } from "@/lib/db/schema";

const customerProfileValueSchema = z.string().trim().max(160).default("");
const customerProfileNameFieldSchema = z.string().trim().max(80).default("");

export const customerProfileUpdateSchema = z
  .object({
    name: z.string().trim().max(120).optional(),
    firstName: customerProfileNameFieldSchema.optional(),
    lastName: customerProfileNameFieldSchema.optional(),
    phone: z.string().trim().max(40).default(""),
    preferredChannel: z.enum(["", "whatsapp", "instagram", "email"]),
    cuil: z
      .string()
      .trim()
      .regex(/^$|^\d{2}-?\d{8}-?\d$/, "Usá un CUIL válido de 11 dígitos.")
      .optional(),
    shippingRecipient: customerProfileValueSchema.optional(),
    shippingStreet: customerProfileValueSchema.optional(),
    shippingStreetNumber: customerProfileValueSchema.optional(),
    shippingAddressLine1: customerProfileValueSchema.optional(),
    shippingAddressLine2: customerProfileValueSchema,
    shippingCity: customerProfileValueSchema,
    shippingProvince: customerProfileValueSchema,
    shippingPostalCode: customerProfileValueSchema,
    shippingDeliveryNotes: z.string().trim().max(320).optional(),
  })
  .transform((value, context) => {
    const derivedName = deriveCustomerNameParts(value.name ?? "");
    const derivedStreet = deriveStreetAddressParts(value.shippingAddressLine1 ?? "");
    const firstName = (value.firstName ?? derivedName.firstName).trim();
    const lastName = (value.lastName ?? derivedName.lastName).trim();
    const name = normalizeCustomerFullName(firstName, lastName);
    const shippingStreet = (value.shippingStreet ?? derivedStreet.street).trim();
    const shippingStreetNumber = (value.shippingStreetNumber ?? derivedStreet.streetNumber).trim();

    if (!firstName || !lastName || name.length < 2) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Completá nombre y apellido.",
        path: [!firstName ? "firstName" : "lastName"],
      });
    }

    return {
      name,
      firstName,
      lastName,
      phone: value.phone,
      preferredChannel: value.preferredChannel,
      cuil: value.cuil,
      shippingRecipient: value.shippingRecipient,
      shippingStreet,
      shippingStreetNumber,
      shippingAddressLine1: normalizeStreetAddressLine(shippingStreet, shippingStreetNumber),
      shippingAddressLine2: value.shippingAddressLine2,
      shippingCity: value.shippingCity,
      shippingProvince: value.shippingProvince,
      shippingPostalCode: value.shippingPostalCode,
      shippingDeliveryNotes: value.shippingDeliveryNotes,
    };
  });

export type CustomerProfileUpdateInput = z.infer<typeof customerProfileUpdateSchema>;

export interface CustomerProfileSnapshot extends CustomerProfileUpdateInput {
  id: string;
  email: string;
  name: string;
  cuil: string;
  shippingRecipient: string;
  shippingAddressLine1: string;
  shippingDeliveryNotes: string;
}

function requireDb() {
  const db = getDb();

  if (!db) {
    throw new CustomerAuthConfigurationError("La base de datos no está configurada para guardar perfiles customer.");
  }

  return db;
}

function normalizeCuil(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 11) {
    return value.trim();
  }

  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
}

function mapCustomerProfile(record: typeof customerAccounts.$inferSelect): CustomerProfileSnapshot {
  const nameParts = deriveCustomerNameParts(record.name);
  const streetParts = deriveStreetAddressParts(record.shippingAddressLine1);

  return {
    id: record.id,
    email: record.email,
    name: record.name,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    phone: record.phone,
    preferredChannel:
      record.preferredChannel === "whatsapp" || record.preferredChannel === "instagram" || record.preferredChannel === "email"
        ? record.preferredChannel
        : "",
    cuil: record.cuil,
    shippingRecipient: record.shippingRecipient || record.name,
    shippingStreet: streetParts.street,
    shippingStreetNumber: streetParts.streetNumber,
    shippingAddressLine1: record.shippingAddressLine1,
    shippingAddressLine2: record.shippingAddressLine2,
    shippingCity: record.shippingCity,
    shippingProvince: record.shippingProvince,
    shippingPostalCode: record.shippingPostalCode,
    shippingDeliveryNotes: record.shippingDeliveryNotes,
  };
}

export function formatCustomerProfileShipping(
  profile: Pick<
    CustomerProfileSnapshot,
    | "shippingStreet"
    | "shippingStreetNumber"
    | "shippingRecipient"
    | "shippingAddressLine1"
    | "shippingAddressLine2"
    | "shippingCity"
    | "shippingProvince"
    | "shippingPostalCode"
  >,
) {
  return buildCustomerProfileShippingSummary(profile);
}

export async function getCustomerProfileById(customerId: string) {
  const db = requireDb();
  const account = await db.query.customerAccounts.findFirst({
    where: eq(customerAccounts.id, customerId),
  });

  return account ? mapCustomerProfile(account) : null;
}

export async function updateCustomerProfile(customerId: string, input: CustomerProfileUpdateInput) {
  const db = requireDb();
  const values = customerProfileUpdateSchema.parse(input);
  const existingAccount = await db.query.customerAccounts.findFirst({
    where: eq(customerAccounts.id, customerId),
  });

  if (!existingAccount) {
    return null;
  }

  await db
    .update(customerAccounts)
    .set({
      name: values.name,
      phone: values.phone,
      preferredChannel: values.preferredChannel,
      cuil: values.cuil === undefined ? existingAccount.cuil : normalizeCuil(values.cuil),
      shippingRecipient: values.shippingRecipient === undefined ? existingAccount.shippingRecipient : values.shippingRecipient,
      shippingAddressLine1: values.shippingAddressLine1,
      shippingAddressLine2: values.shippingAddressLine2,
      shippingCity: values.shippingCity,
      shippingProvince: values.shippingProvince,
      shippingPostalCode: values.shippingPostalCode,
      shippingDeliveryNotes:
        values.shippingDeliveryNotes === undefined ? existingAccount.shippingDeliveryNotes : values.shippingDeliveryNotes,
      updatedAt: new Date(),
    })
    .where(eq(customerAccounts.id, customerId));

  const updatedAccount = await db.query.customerAccounts.findFirst({
    where: eq(customerAccounts.id, customerId),
  });

  if (!updatedAccount) {
    return null;
  }

  return mapCustomerProfile(updatedAccount);
}
