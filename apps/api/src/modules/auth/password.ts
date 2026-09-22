import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [algorithm, salt, storedHex] = encoded.split("$");
  if (algorithm !== "scrypt" || !salt || !storedHex) return false;

  const stored = Buffer.from(storedHex, "hex");
  const candidate = (await scrypt(password, salt, stored.length)) as Buffer;
  return stored.length === candidate.length && timingSafeEqual(stored, candidate);
}
