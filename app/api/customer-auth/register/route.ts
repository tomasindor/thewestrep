import { ZodError } from "zod";

import { customerRegistrationSchema } from "@/lib/auth/customer-credentials";
import {
  CustomerAccountExistsError,
  CustomerAuthConfigurationError,
  registerCustomerEmailPasswordAccount,
} from "@/lib/auth/customer-accounts";
import { applyRateLimit } from "@/lib/security/with-rate-limit";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  const rateLimit = applyRateLimit(request, "register", { maxRequests: 3, windowMs: 5 * 60 * 1000 });
  if (rateLimit) return rateLimit;

  try {
    const payload = customerRegistrationSchema.parse(await request.json());
    const account = await registerCustomerEmailPasswordAccount(payload);

    return Response.json(
      {
        account: {
          id: account.id,
          email: account.email,
          name: account.name,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof CustomerAccountExistsError) {
      return Response.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof CustomerAuthConfigurationError) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof ZodError) {
      return Response.json({ error: "Revisá los datos de la cuenta antes de seguir." }, { status: 400 });
    }

    logger.error("customer_registration_failed", { error: error instanceof Error ? error.message : String(error) });

    return Response.json({ error: "No pudimos crear tu cuenta en este momento." }, { status: 500 });
  }
}
