import { ZodError } from "zod";

import { CustomerAuthConfigurationError } from "@/lib/auth/customer-accounts";
import { getCustomerProfileById, customerProfileUpdateSchema, updateCustomerProfile } from "@/lib/auth/customer-profile";
import { getCustomerSession } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

function getUnauthorizedResponse() {
  return Response.json({ error: "Necesitás iniciar sesión para gestionar tu perfil." }, { status: 401 });
}

export async function GET() {
  const session = await getCustomerSession();

  if (!session?.user?.id) {
    return getUnauthorizedResponse();
  }

  try {
    const profile = await getCustomerProfileById(session.user.id);

    if (!profile) {
      return Response.json({ error: "No encontramos tu perfil customer." }, { status: 404 });
    }

    return Response.json({ profile });
  } catch (error) {
    if (error instanceof CustomerAuthConfigurationError) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    logger.error("profile_update_failed", { error: error instanceof Error ? error.message : String(error) });

    return Response.json({ error: "No pudimos cargar tu perfil ahora." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getCustomerSession();

  if (!session?.user?.id) {
    return getUnauthorizedResponse();
  }

  try {
    const payload = customerProfileUpdateSchema.parse(await request.json());
    const profile = await updateCustomerProfile(session.user.id, payload);

    if (!profile) {
      return Response.json({ error: "No encontramos tu perfil customer." }, { status: 404 });
    }

    return Response.json({ profile });
  } catch (error) {
    if (error instanceof CustomerAuthConfigurationError) {
      return Response.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof ZodError) {
      return Response.json({ error: error.issues[0]?.message ?? "Revisá los datos del perfil." }, { status: 400 });
    }

    logger.error("profile_update_failed", { error: error instanceof Error ? error.message : String(error) });

    return Response.json({ error: "No pudimos guardar tu perfil ahora." }, { status: 500 });
  }
}
