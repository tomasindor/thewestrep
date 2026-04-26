export function isPlaywrightRuntime(input: {
  playwrightEnv?: string;
  requestHeader?: string | null;
}): boolean {
  return input.playwrightEnv === "1" || input.requestHeader === "1";
}
