import crypto from "node:crypto";

/**
 * Generate a random string
 */
export function generateRandomSecureString(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateUuid() {
  return crypto.randomUUID();
}

export function hashString(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}
