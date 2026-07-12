export function requireEnvValue(
  name: string,
  value: string | undefined,
): string {
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
