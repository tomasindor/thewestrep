export interface EmailVerifiedBackfillCandidate {
  emailVerified: Date | null;
  googleSubject: string | null;
  passwordResetToken: string | null;
}

export function shouldTreatAccountAsVerifiedCandidate(candidate: EmailVerifiedBackfillCandidate) {
  if (candidate.emailVerified) {
    return false;
  }

  return candidate.googleSubject !== null || candidate.passwordResetToken === null;
}

export function buildEmailVerifiedBackfillSql() {
  return [
    "UPDATE customer_accounts",
    "SET email_verified = NOW(),",
    "    updated_at = NOW()",
    "WHERE email_verified IS NULL",
    "  AND (google_subject IS NOT NULL OR password_reset_token IS NULL);",
  ].join("\n");
}
