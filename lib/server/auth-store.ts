import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  joinPatientFullName,
  splitPatientFullName,
  type PatientDetails,
} from "@/lib/checkup";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  createdAt: number;
  profile: PatientDetails;
};

type SessionRecord = {
  token: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
};

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const SEEDED_TEST_EMAIL = "test@veramed.cl";
const SEEDED_TEST_PASSWORD = "test123";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createSessionToken() {
  return randomBytes(32).toString("hex");
}

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

function verifyPassword(password: string, passwordHash: string, passwordSalt: string) {
  const nextHash = scryptSync(password, passwordSalt, 64);
  const currentHash = Buffer.from(passwordHash, "hex");

  if (nextHash.length !== currentHash.length) {
    return false;
  }

  return timingSafeEqual(nextHash, currentHash);
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
  const session: SessionRecord = {
    token: createSessionToken(),
    userId,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
  };

  await prisma.session.create({
    data: session,
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

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
}) {
  await ensureSeededTestUser();
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
  await ensureSeededTestUser();
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
  await ensureSeededTestUser();
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

  await ensureSeededTestUser();
  await purgeExpiredSessions();

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

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
    where: { token },
  });
}

export async function syncUserProfileFromPatient(userId: string, patient: PatientDetails) {
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

export function getSessionTtlMs() {
  return SESSION_TTL_MS;
}
