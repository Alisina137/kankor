export const supportedLanguages = ["fa", "ps", "en"] as const;
export const preparationLevels = ["starting", "some_preparation", "intensive"] as const;

export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320;
}

export function validPassword(password: unknown): password is string {
  return typeof password === "string" && password.length >= 8 && password.length <= 128;
}

export function validLanguage(value: unknown): value is typeof supportedLanguages[number] {
  return typeof value === "string" && supportedLanguages.includes(value as typeof supportedLanguages[number]);
}

export function validPreparationLevel(value: unknown) {
  return value == null || (
    typeof value === "string" &&
    preparationLevels.includes(value as typeof preparationLevels[number])
  );
}

export function validTargetYear(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1405 && Number(value) <= 1420;
}
