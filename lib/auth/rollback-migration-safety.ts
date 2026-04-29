export interface RollbackAuthSourceValidation {
  hasAdminProvider: boolean;
  hasLegacyCustomerCredentialsProvider: boolean;
  hasLegacyCustomerGoogleProvider: boolean;
  hasAdminSigninRoute: boolean;
  hasAdminSessionCookie: boolean;
  rollbackReady: boolean;
  issues: string[];
}

export interface MigrationDryRunInput {
  target: string;
  command: string;
  explicitConfirmation: boolean;
}

export type MigrationTargetClassification = "safe-local" | "safe-test" | "blocked";

export interface MigrationDryRunChecklist {
  classification: MigrationTargetClassification;
  canRun: boolean;
  command: string;
  reasons: string[];
}

export interface LegacyCustomerCompatibilityFixture {
  customerId: string;
  email: string;
  plainPassword: string;
  passwordHash: string;
  legacySessionToken: string | null;
}

export interface LegacyCustomerCompatibilityDeps {
  verifyPassword: (password: string, passwordHash: string) => Promise<boolean>;
  createSession: (customerId: string) => Promise<{ token: string; expiresAt: Date }>;
}

export interface LegacyCustomerCompatibilityResult {
  customerId: string;
  passwordValid: boolean;
  sessionCreated: boolean;
  newSessionToken: string | null;
  legacySessionToken: string | null;
}

export function validateRollbackAuthSource(source: string): RollbackAuthSourceValidation {
  const hasAdminProvider = /adminCredentialsProvider/.test(source);
  const hasLegacyCustomerCredentialsProvider = /getCustomerCredentialsProvider\s*\(/.test(source);
  const hasLegacyCustomerGoogleProvider = /getCustomerGoogleProvider\s*\(/.test(source);
  const hasAdminSigninRoute = /signIn\s*:\s*["'`]\/admin\/login["'`]/.test(source);
  const hasAdminSessionCookie = /name\s*:\s*["'`]admin-session["'`]/.test(source);
  const issues: string[] = [];

  if (!hasAdminProvider) {
    issues.push("Missing admin provider wiring for /admin boundary.");
  }

  if (!hasLegacyCustomerCredentialsProvider) {
    issues.push("Missing legacy customer credentials provider for rollback validation.");
  }

  if (!hasAdminSigninRoute) {
    issues.push("Missing /admin/login sign-in page mapping.");
  }

  if (!hasAdminSessionCookie) {
    issues.push("Missing admin-session cookie isolation.");
  }

  return {
    hasAdminProvider,
    hasLegacyCustomerCredentialsProvider,
    hasLegacyCustomerGoogleProvider,
    hasAdminSigninRoute,
    hasAdminSessionCookie,
    rollbackReady:
      hasAdminProvider &&
      hasLegacyCustomerCredentialsProvider &&
      hasAdminSigninRoute &&
      hasAdminSessionCookie,
    issues,
  };
}

function classifyMigrationTarget(target: string): MigrationTargetClassification {
  const normalized = target.trim().toLowerCase();

  if (normalized.includes("localhost") || normalized.includes("127.0.0.1")) {
    return "safe-local";
  }

  if (normalized.includes("_test") || normalized.includes(".test") || normalized.includes("test-db")) {
    return "safe-test";
  }

  return "blocked";
}

function ensureDryRunCommand(command: string): string {
  return command.includes("--dry-run") ? command : `${command} --dry-run`;
}

export function buildMigrationDryRunChecklist(input: MigrationDryRunInput): MigrationDryRunChecklist {
  const classification = classifyMigrationTarget(input.target);
  const command = ensureDryRunCommand(input.command);
  const reasons: string[] = [];

  if (classification === "blocked") {
    reasons.push("Migration target is not a recognized local/test database.");
  }

  if (!input.explicitConfirmation) {
    reasons.push("Migration execution requires explicit target confirmation.");
  }

  return {
    classification,
    command,
    canRun: classification !== "blocked" && input.explicitConfirmation,
    reasons,
  };
}

export async function runLegacyCustomerCompatibilityFixture(
  fixture: LegacyCustomerCompatibilityFixture,
  deps: LegacyCustomerCompatibilityDeps,
): Promise<LegacyCustomerCompatibilityResult> {
  const passwordValid = await deps.verifyPassword(fixture.plainPassword, fixture.passwordHash);

  if (!passwordValid) {
    return {
      customerId: fixture.customerId,
      passwordValid: false,
      sessionCreated: false,
      newSessionToken: null,
      legacySessionToken: fixture.legacySessionToken,
    };
  }

  const session = await deps.createSession(fixture.customerId);

  return {
    customerId: fixture.customerId,
    passwordValid: true,
    sessionCreated: true,
    newSessionToken: session.token,
    legacySessionToken: fixture.legacySessionToken,
  };
}
