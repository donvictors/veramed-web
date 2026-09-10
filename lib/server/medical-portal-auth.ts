import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { ClinicalRequestTypeDb, MedicalPortalRoleDb, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRequestIpHash, hashOpaqueToken } from "@/lib/server/http-security";
import { hashPassword, verifyPassword } from "@/lib/server/password-hashing";
import { getConfiguredMedicalSigner } from "@/lib/server/medical-approval";

export const MEDICAL_PORTAL_SESSION_COOKIE = "veramed_medicos_session";
export const PRIMARY_MEDICAL_ADMIN_EMAIL = (
  process.env.PRIMARY_MEDICAL_ADMIN_EMAIL ?? "victorrebolledom@gmail.com"
)
  .trim()
  .toLowerCase();
const SESSION_TTL_SECONDS = 60 * 60 * 12;

export type MedicalPortalRole = "portal" | "doctor" | "admin";

export type MedicalPortalSessionIdentity = {
  sessionId: string;
  userId: string;
  email: string;
  name: string;
  medicalRut?: string;
  sisRegistration?: string;
  role: MedicalPortalRole;
  expiresAt: Date;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isPrimaryMedicalAdmin(email: string) {
  return normalizeEmail(email) === PRIMARY_MEDICAL_ADMIN_EMAIL;
}

export function canManageMedicalUsers(session: MedicalPortalSessionIdentity) {
  return session.role === "admin";
}

export function canValidateMedicalOrders(session: MedicalPortalSessionIdentity) {
  return session.role === "doctor" || session.role === "admin";
}

function getBootstrapCredentials() {
  const email = normalizeEmail(process.env.MEDICOS_PORTAL_EMAIL ?? "");
  const password = process.env.MEDICOS_PORTAL_PASSWORD ?? "";
  if (!email || password.length < 10) return null;
  return {
    email,
    password,
    name: process.env.MEDICOS_PORTAL_DOCTOR_NAME?.trim() || "Médico Veramed",
  };
}

async function ensureBootstrapMedicalUser() {
  const existingCount = await prisma.medicalPortalUser.count();
  if (existingCount > 0) return;
  const credentials = getBootstrapCredentials();
  if (!credentials) return;
  const { hash, salt } = hashPassword(credentials.password);
  const signer = getConfiguredMedicalSigner();
  try {
    await prisma.medicalPortalUser.create({
      data: {
        email: credentials.email,
        name: credentials.name,
        medicalRut: signer.rut,
        sisRegistration: signer.sisRegistration,
        role: MedicalPortalRoleDb.admin,
        passwordHash: hash,
        passwordSalt: salt,
      },
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      throw error;
    }
  }
}

async function preservePrimaryMedicalAdmin() {
  await prisma.medicalPortalUser.updateMany({
    where: {
      email: PRIMARY_MEDICAL_ADMIN_EMAIL,
      OR: [{ active: false }, { role: { not: MedicalPortalRoleDb.admin } }],
    },
    data: { active: true, role: MedicalPortalRoleDb.admin },
  });
}

function getMfaKey() {
  const source =
    process.env.MEDICAL_PORTAL_MFA_ENCRYPTION_KEY?.trim() ||
    process.env.MEDICOS_PORTAL_AUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim();
  if (!source) throw new Error("No hay una llave configurada para proteger MFA.");
  return createHash("sha256").update(source).digest();
}

function decryptTotpSecret(payload: string) {
  const [version, ivRaw, tagRaw, ciphertextRaw] = payload.split(".");
  if (version !== "v1" || !ivRaw || !tagRaw || !ciphertextRaw) {
    throw new Error("Secreto MFA inválido.");
  }
  const decipher = createDecipheriv("aes-256-gcm", getMfaKey(), Buffer.from(ivRaw, "base64url"));
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function encryptTotpSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getMfaKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

function decodeBase32(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = value.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = "";
  for (const char of cleaned) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error("Secreto TOTP inválido.");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  return Buffer.from(bytes);
}

function totpAt(secret: string, timestampMs: number) {
  const counter = Math.floor(timestampMs / 30_000);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export function verifyTotpCode(secret: string, rawCode: string) {
  const code = rawCode.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(code)) return false;
  return [-30_000, 0, 30_000].some((offset) => {
    const expected = Buffer.from(totpAt(secret, Date.now() + offset));
    const received = Buffer.from(code);
    return expected.length === received.length && timingSafeEqual(expected, received);
  });
}

export function createTotpSecret() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = randomBytes(20);
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  let output = "";
  for (let offset = 0; offset < bits.length; offset += 5) {
    output += alphabet[Number.parseInt(bits.slice(offset, offset + 5).padEnd(5, "0"), 2)];
  }
  return output;
}

export async function validateDoctorCredentials(input: {
  email: string;
  password: string;
  totpCode?: string;
}) {
  await ensureBootstrapMedicalUser();
  await preservePrimaryMedicalAdmin();
  const user = await prisma.medicalPortalUser.findUnique({
    where: { email: normalizeEmail(input.email) },
  });
  if (!user || !user.active || !verifyPassword(input.password, user.passwordHash, user.passwordSalt)) {
    return { ok: false, reason: "Credenciales inválidas." } as const;
  }
  if (user.mfaEnabled) {
    if (!user.totpSecretEncrypted || !input.totpCode) {
      return { ok: false, reason: "Ingresa el código de autenticación de seis dígitos." } as const;
    }
    const secret = decryptTotpSecret(user.totpSecretEncrypted);
    if (!verifyTotpCode(secret, input.totpCode)) {
      return { ok: false, reason: "Código de autenticación inválido." } as const;
    }
  }
  return { ok: true, user } as const;
}

export async function createMedicalPortalSession(input: {
  userId: string;
  request: Request;
}) {
  const rawToken = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
  const userAgent = input.request.headers.get("user-agent")?.slice(0, 500) || null;
  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.medicalPortalSession.create({
      data: {
        tokenHash: hashOpaqueToken(rawToken),
        userId: input.userId,
        expiresAt,
        ipHash: getRequestIpHash(input.request),
        userAgent,
      },
    });
    await tx.medicalPortalUser.update({
      where: { id: input.userId },
      data: { lastLoginAt: now },
    });
    return created;
  });
  return { token: rawToken, session };
}

export async function verifyMedicalPortalSessionToken(token?: string | null) {
  if (!token || token.length > 200) return null;
  await preservePrimaryMedicalAdmin();
  const row = await prisma.medicalPortalSession.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    include: { user: true },
  });
  if (!row || row.revokedAt || row.expiresAt.getTime() <= Date.now() || !row.user.active) {
    return null;
  }
  if (Date.now() - row.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await prisma.medicalPortalSession.update({
      where: { id: row.id },
      data: { lastSeenAt: new Date() },
    });
  }
  return {
    sessionId: row.id,
    userId: row.user.id,
    email: row.user.email,
    name: row.user.name,
    medicalRut: row.user.medicalRut ?? undefined,
    sisRegistration: row.user.sisRegistration ?? undefined,
    role: row.user.role,
    expiresAt: row.expiresAt,
  } satisfies MedicalPortalSessionIdentity;
}

export async function revokeMedicalPortalSession(token?: string | null) {
  if (!token) return;
  await prisma.medicalPortalSession.updateMany({
    where: { tokenHash: hashOpaqueToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function recordMedicalAudit(input: {
  session: MedicalPortalSessionIdentity;
  action: string;
  request: Request;
  requestType?: "checkup" | "chronic_control" | "symptoms";
  requestId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.medicalAuditLog.create({
    data: {
      userId: input.session.userId,
      actorEmail: input.session.email,
      action: input.action.slice(0, 100),
      requestType: input.requestType as ClinicalRequestTypeDb | undefined,
      requestId: input.requestId?.slice(0, 100),
      metadata: input.metadata,
      ipHash: getRequestIpHash(input.request),
    },
  });
}

export async function beginTotpEnrollment(session: MedicalPortalSessionIdentity) {
  const secret = createTotpSecret();
  await prisma.medicalPortalUser.update({
    where: { id: session.userId },
    data: { totpSecretEncrypted: encryptTotpSecret(secret), mfaEnabled: false },
  });
  const issuer = encodeURIComponent("Veramed Portal Médico");
  const label = encodeURIComponent(`Veramed:${session.email}`);
  return {
    secret,
    otpauthUrl: `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`,
  };
}

export async function confirmTotpEnrollment(
  session: MedicalPortalSessionIdentity,
  code: string,
) {
  const user = await prisma.medicalPortalUser.findUnique({ where: { id: session.userId } });
  if (!user?.totpSecretEncrypted) return false;
  const valid = verifyTotpCode(decryptTotpSecret(user.totpSecretEncrypted), code);
  if (!valid) return false;
  await prisma.medicalPortalUser.update({
    where: { id: session.userId },
    data: { mfaEnabled: true },
  });
  return true;
}

export function getMedicalPortalSessionMaxAgeSeconds() {
  return SESSION_TTL_SECONDS;
}
