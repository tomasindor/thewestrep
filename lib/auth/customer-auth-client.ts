import { sanitizeAuthReturnUrl } from "@/lib/auth/customer-auth-navigation";

type AuthMode = "login" | "register";

interface FlowRequest {
  mode: AuthMode;
  name: string;
  email: string;
  password: string;
  returnUrl?: string;
}

interface FlowResultOk {
  ok: true;
  redirectTo: string;
}

interface FlowResultError {
  ok: false;
  error: string;
  code?: "duplicate_email" | "google_account_exists";
}

interface ErrorPayload {
  error?: string;
  code?: "duplicate_email" | "google_account_exists";
}

type FlowResult = FlowResultOk | FlowResultError;

export function isGoogleAuthEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export interface CustomerCredentialsFlowInput extends FlowRequest {
  fetcher?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  now?: () => Date;
}

async function parseJsonError(response: Response) {
  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;
  return payload?.error ?? null;
}

async function parseJsonErrorPayload(response: Response) {
  return (await response.json().catch(() => null)) as ErrorPayload | null;
}

function getRetryAfterSeconds(response: Response) {
  const raw = response.headers.get("retry-after");
  if (!raw) {
    return null;
  }

  const seconds = Number.parseInt(raw, 10);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  return seconds;
}

function toRelativeUrl(candidate: string | null | undefined, fallback: string) {
  if (!candidate) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate);
    return sanitizeAuthReturnUrl(`${parsed.pathname}${parsed.search}${parsed.hash}`, fallback);
  } catch {
    return sanitizeAuthReturnUrl(candidate, fallback);
  }
}

function buildVerifyEmailRedirect(returnUrl: string, email: string) {
  const params = new URLSearchParams({
    returnUrl,
    email,
  });

  return `/verify-email?${params.toString()}`;
}

async function loginCustomer(
  fetcher: NonNullable<CustomerCredentialsFlowInput["fetcher"]>,
  payload: { email: string; password: string; returnUrl: string },
  mode: AuthMode,
): Promise<FlowResult> {
  const response = await fetcher("/api/customer/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "same-origin",
  });

  if (!response.ok) {
    const apiError = await parseJsonError(response);

    if (response.status === 429) {
      const retryAfter = getRetryAfterSeconds(response);
      const suffix = retryAfter ? ` Esperá ${retryAfter} segundos y probá de nuevo.` : "";
      return {
        ok: false,
        error: `${apiError ?? "Demasiados intentos."}${suffix}`.trim(),
      };
    }

    if (response.status === 401) {
      return {
        ok: false,
        error: "No encontramos una cuenta customer válida con ese email y contraseña.",
      };
    }

    return {
      ok: false,
      error:
        apiError ??
        (mode === "register"
          ? "La cuenta se creó, pero no pudimos abrir la sesión automáticamente. Probá entrar de nuevo."
          : "No pudimos iniciar sesión en este momento."),
    };
  }

  return {
    ok: true,
    redirectTo: toRelativeUrl(response.url, payload.returnUrl),
  };
}

export async function executeCustomerCredentialsFlow(input: CustomerCredentialsFlowInput): Promise<FlowResult> {
  const fetcher = input.fetcher ?? fetch;
  const returnUrl = sanitizeAuthReturnUrl(input.returnUrl, "/");

  if (input.mode === "register") {
    const registerResponse = await fetcher("/api/customer/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        email: input.email,
        password: input.password,
        returnUrl,
      }),
      credentials: "same-origin",
    });

    if (!registerResponse.ok) {
      if (registerResponse.status === 429) {
        const registerError = await parseJsonError(registerResponse);
        const retryAfter = getRetryAfterSeconds(registerResponse);
        const suffix = retryAfter ? ` Esperá ${retryAfter} segundos y probá de nuevo.` : "";
        return {
          ok: false,
          error: `${registerError ?? "Demasiados intentos al crear tu cuenta."}${suffix}`.trim(),
        };
      }

      if (registerResponse.status === 409) {
        const registerPayload = await parseJsonErrorPayload(registerResponse);

        if (registerPayload?.code === "google_account_exists") {
          return {
            ok: false,
            error: registerPayload.error ?? "Ese email ya está asociado a Google. Iniciá sesión con Google para continuar.",
            code: "google_account_exists",
          };
        }

        return {
          ok: false,
          error: registerPayload?.error ?? "Ya existe una cuenta para ese email. Iniciá sesión o recuperá tu contraseña.",
          code: "duplicate_email",
        };
      }

      const registerError = await parseJsonError(registerResponse);
      return {
        ok: false,
        error: registerError ?? "No pudimos crear tu cuenta ahora.",
      };
    }

    const registerPayload = (await registerResponse.json().catch(() => null)) as
      | { redirectTo?: string }
      | null;

    return {
      ok: true,
      redirectTo: toRelativeUrl(registerPayload?.redirectTo, buildVerifyEmailRedirect(returnUrl, input.email)),
    };
  }

  return loginCustomer(
    fetcher,
    {
      email: input.email,
      password: input.password,
      returnUrl,
    },
    input.mode,
  );
}
