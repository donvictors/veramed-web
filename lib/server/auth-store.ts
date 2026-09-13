import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  formatRut,
  joinPatientFullName,
  normalizeRut,
  splitPatientFullName,
  type PatientDetails,
} from "@/lib/checkup";
import { hashOpaqueToken } from "@/lib/server/http-security";
import { hashPassword, verifyPassword } from "@/lib/server/password-hashing";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  createdAt: number;
  profile: PatientDetails & { sex: "M" | "F" | "" };
};

type SessionRecord = {
  token: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
};

const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60;
const SESSION_TTL_MS = (() => {
  const raw = process.env.AUTH_SESSION_TTL_MS;
  if (!raw) {
    return DEFAULT_SESSION_TTL_MS;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_SESSION_TTL_MS;
  }

  return Math.floor(parsed);
})();
const SEEDED_TEST_EMAIL = "test@veramed.cl";
const SEEDED_TEST_PASSWORD = "test123";
const ENABLE_AUTO_SEEDED_TEST_USER = process.env.ENABLE_AUTO_SEEDED_TEST_USER === "1";
let seedUserPromise: Promise<void> | null = null;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createSessionToken() {
  return randomBytes(32).toString("hex");
}

function createDefaultProfile(name: string, email: string, overrides?: Partial<PatientDetails>): PatientDetails {
  const normalizedFullName = overrides?.fullName ?? name;
  return {
    fullName: normalizedFullName,
    rut: overrides?.rut ?? "",
    birthDate: overrides?.birthDate ?? "",
    email: overrides?.email ?? email,
    phone: overrides?.phone ?? "",
    address: overrides?.address ?? "",
  };
}

function serializeUser(user: {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  profileFirstName: string;
  profilePaternalSurname: string;
  profileMaternalSurname: string;
  profileRut: string;
  profileBirthDate: string;
  profileSex: string;
  profileEmail: string;
  profilePhone: string;
  profileAddress: string;
}): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.getTime(),
    profile: {
      fullName: joinPatientFullName({
        firstName: user.profileFirstName,
        paternalSurname: user.profilePaternalSurname,
        maternalSurname: user.profileMaternalSurname,
      }),
      rut: user.profileRut,
      birthDate: user.profileBirthDate,
      sex: user.profileSex === "M" || user.profileSex === "F" ? user.profileSex : "",
      email: user.profileEmail,
      phone: user.profilePhone,
      address: user.profileAddress,
    },
  };
}

async function purgeExpiredSessions() {
  await prisma.session.deleteMany({
    where: {
      expiresAt: {
        lte: new Date(),
      },
    },
  });
}

async function createSession(userId: string) {
  const now = new Date();
  const rawToken = createSessionToken();
  const session: SessionRecord = {
    token: rawToken,
    userId,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
  };

  await prisma.session.create({
    data: {
      ...session,
      token: hashOpaqueToken(rawToken),
    },
  });

  return session;
}

export async function ensureSeededTestUser() {
  const seededEmail = normalizeEmail(SEEDED_TEST_EMAIL);
  const existing = await prisma.user.findUnique({
    where: { email: seededEmail },
  });

  if (existing) {
    return serializeUser(existing);
  }

  const { hash, salt } = hashPassword(SEEDED_TEST_PASSWORD);
  const name = "Usuario Test Veramed";
  const profile = createDefaultProfile(name, seededEmail, {
    rut: "11.111.111-1",
    phone: "+56911111111",
    address: "Santiago, Chile",
  });
  const nameFields = splitPatientFullName(profile.fullName);

  const user = await prisma.user.create({
    data: {
      name,
      email: seededEmail,
      passwordHash: hash,
      passwordSalt: salt,
      profileFirstName: nameFields.firstName,
      profilePaternalSurname: nameFields.paternalSurname,
      profileMaternalSurname: nameFields.maternalSurname,
      profileRut: profile.rut,
      profileBirthDate: profile.birthDate,
      profileEmail: profile.email,
      profilePhone: profile.phone,
      profileAddress: profile.address,
    },
  });

  return serializeUser(user);
}

async function maybeEnsureSeededTestUser() {
  if (!ENABLE_AUTO_SEEDED_TEST_USER) {
    return;
  }

  if (!seedUserPromise) {
    seedUserPromise = ensureSeededTestUser().then(() => undefined);
  }

  await seedUserPromise;
}

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
}) {
  await maybeEnsureSeededTestUser();
  await purgeExpiredSessions();

  const email = normalizeEmail(payload.email);
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    return { error: "Ya existe una cuenta con ese correo." } as const;
  }

  const { hash, salt } = hashPassword(payload.password);
  const profile = createDefaultProfile(payload.name.trim(), email);
  const nameFields = splitPatientFullName(profile.fullName);

  const user = await prisma.user.create({
    data: {
      name: payload.name.trim(),
      email,
      passwordHash: hash,
      passwordSalt: salt,
      profileFirstName: nameFields.firstName,
      profilePaternalSurname: nameFields.paternalSurname,
      profileMaternalSurname: nameFields.maternalSurname,
      profileRut: profile.rut,
      profileBirthDate: profile.birthDate,
      profileEmail: profile.email,
      profilePhone: profile.phone,
      profileAddress: profile.address,
    },
  });

  const session = await createSession(user.id);

  return {
    user: serializeUser(user),
    session,
  };
}

export async function loginUser(payload: { email: string; password: string }) {
  await maybeEnsureSeededTestUser();
  await purgeExpiredSessions();

  const email = normalizeEmail(payload.email);
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !verifyPassword(payload.password, user.passwordHash, user.passwordSalt)) {
    return { error: "Correo o contraseña inválidos." } as const;
  }

  const session = await createSession(user.id);

  return {
    user: serializeUser(user),
    session,
  };
}

export async function loginOrRegisterOAuthUser(payload: { email: string; name: string }) {
  await maybeEnsureSeededTestUser();
  await purgeExpiredSessions();

  const email = normalizeEmail(payload.email);
  const name = payload.name.trim() || "Usuario Veramed";
  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    const temporaryPassword = randomBytes(24).toString("hex");
    const { hash, salt } = hashPassword(temporaryPassword);
    const profile = createDefaultProfile(name, email);
    const nameFields = splitPatientFullName(profile.fullName);

    user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hash,
        passwordSalt: salt,
        profileFirstName: nameFields.firstName,
        profilePaternalSurname: nameFields.paternalSurname,
        profileMaternalSurname: nameFields.maternalSurname,
        profileRut: profile.rut,
        profileBirthDate: profile.birthDate,
        profileEmail: profile.email,
        profilePhone: profile.phone,
        profileAddress: profile.address,
      },
    });
  }

  const session = await createSession(user.id);

  return {
    user: serializeUser(user),
    session,
  };
}

export async function getUserFromSession(token: string | undefined) {
  if (!token) {
    return null;
  }

  await maybeEnsureSeededTestUser();
  await purgeExpiredSessions();

  const tokenHash = hashOpaqueToken(token);
  let session = await prisma.session.findUnique({
    where: { token: tokenHash },
    include: { user: true },
  });

  // Compatibilidad de una sola lectura para sesiones emitidas antes del hash at-rest.
  if (!session) {
    const legacy = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (legacy) {
      session = await prisma.session.update({
        where: { token },
        data: { token: tokenHash },
        include: { user: true },
      });
    }
  }

  if (!session?.user) {
    return null;
  }

  return serializeUser(session.user);
}

export async function logoutSession(token: string | undefined) {
  if (!token) {
    return;
  }

  await prisma.session.deleteMany({
    where: { token: { in: [token, hashOpaqueToken(token)] } },
  });
}

export async function findUserForPasswordReset(emailRaw: string) {
  const email = normalizeEmail(emailRaw);
  if (!email) return null;
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
    },
  });
}

export async function findUserForPasswordResetById(userId: string) {
  if (!userId?.trim()) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      passwordHash: true,
    },
  });
}

export async function resetPasswordByUserId(userId: string, nextPassword: string) {
  const { hash, salt } = hashPassword(nextPassword);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: hash,
      passwordSalt: salt,
    },
    select: {
      id: true,
    },
  });

  await prisma.session.deleteMany({
    where: {
      userId: updated.id,
    },
  });

  return updated.id;
}

export async function syncUserProfileFromPatient(
  userId: string,
  patient: PatientDetails,
  sex?: "M" | "F" | "",
) {
  const current = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!current) {
    return null;
  }

  const nameFields = splitPatientFullName(patient.fullName);

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      name: patient.fullName.trim() || current.name,
      profileFirstName: nameFields.firstName || current.profileFirstName,
      profilePaternalSurname: nameFields.paternalSurname || current.profilePaternalSurname,
      profileMaternalSurname: nameFields.maternalSurname || current.profileMaternalSurname,
      profileRut: patient.rut.trim() || current.profileRut,
      profileBirthDate: patient.birthDate || current.profileBirthDate,
      profileSex: sex === "M" || sex === "F" ? sex : current.profileSex,
      profileEmail: normalizeEmail(patient.email.trim() || current.profileEmail || current.email),
      profilePhone: patient.phone.trim() || current.profilePhone,
      profileAddress: patient.address.trim() || current.profileAddress,
    },
  });

  return serializeUser(user);
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  return user ? serializeUser(user) : null;
}

export async function updateUserProfile(
  userId: string,
  payload: {
    firstName: string;
    paternalSurname: string;
    maternalSurname: string;
    rut: string;
    birthDate: string;
    sex: "M" | "F" | "";
    email: string;
    phone?: string;
    address?: string;
  },
) {
  const current = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!current) {
    return null;
  }

  const firstName = payload.firstName.trim();
  const paternalSurname = payload.paternalSurname.trim();
  const maternalSurname = payload.maternalSurname.trim();
  const fullName = joinPatientFullName({
    firstName,
    paternalSurname,
    maternalSurname,
  });

  const normalizedRut = formatRut(normalizeRut(payload.rut));
  const normalizedEmail = normalizeEmail(payload.email);
  const normalizedPhone = payload.phone?.trim() ?? "";
  const normalizedAddress = payload.address?.trim() ?? "";

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name: fullName || current.name,
      email: normalizedEmail,
      profileFirstName: firstName,
      profilePaternalSurname: paternalSurname,
      profileMaternalSurname: maternalSurname,
      profileRut: normalizedRut,
      profileBirthDate: payload.birthDate,
      profileSex: payload.sex,
      profileEmail: normalizedEmail,
      profilePhone: normalizedPhone,
      profileAddress: normalizedAddress,
    },
  });

  return serializeUser(updated);
}

export function getSessionTtlMs() {
  return SESSION_TTL_MS;
}
