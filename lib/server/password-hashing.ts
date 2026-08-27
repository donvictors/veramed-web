import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, passwordHash: string, passwordSalt: string) {
  const nextHash = scryptSync(password, passwordSalt, 64);
  const currentHash = Buffer.from(passwordHash, "hex");

  if (nextHash.length !== currentHash.length) return false;
  return timingSafeEqual(nextHash, currentHash);
}
