import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { type PatientDetails } from "@/lib/checkup";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  profile: PatientDetails;
  passwordHash: string;
  passwordSalt: string;
  createdAt: number;
  updatedAt: number;
};

type SessionRecord = {
  token: string;
  userId: string;
  createdAt: number;
  expiresAt: number;
};

type AuthStore = {
  users: Record<string, UserRecord>;
  userIdsByEmail: Record<string, string>;
  sessions: Record<string, SessionRecord>;
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  createdAt: number;
  profile: PatientDetails;
};

const STORE_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(STORE_DIR, "auth.json");
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const SEEDED_TEST_EMAIL = "test@veramed.cl";
const SEEDED_TEST_PASSWORD = "test123";

function createDefaultProfile(name: string, email: string, overrides?: Partial<PatientDetails>): PatientDetails {
  return {
    fullName: overrides?.fullName ?? name,
    rut: overrides?.rut ?? "",
    birthDate: overrides?.birthDate ?? "",
    email: overrides?.email ?? email,
    phone: overrides?.phone ?? "",
    address: overrides?.address ?? "",
  };
}

function createEmptyStore(): AuthStore {
  return {
    users: {},
    userIdsByEmail: {},
    sessions: {},
  };
}

async function ensureStoreFile() {
  await mkdir(STORE_DIR, { recursive: true });
  try {
    await readFile(STORE_FILE, "utf8");
  } catch {
    await writeFile(STORE_FILE, JSON.stringify(createEmptyStore(), null, 2), "utf8");
  }
}

async function readStore() {
  await ensureStoreFile();
  const raw = await readFile(STORE_FILE, "utf8");
  return JSON.parse(raw) as AuthStore;
}

async function writeStore(store: AuthStore) {
  await ensureStoreFile();
  await writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

function ensureSeedAndMigrations(store: AuthStore) {
  for (const user of Object.values(store.users)) {
    if (!user.profile) {
      user.profile = createDefaultProfile(user.name, user.email);
      user.updatedAt = Date.now();
    }
  }

  const seededEmail = normalizeEmail(SEEDED_TEST_EMAIL);
  if (store.userIdsByEmail[seededEmail]) {
    return;
  }

  const now = Date.now();
  const { hash, salt } = hashPassword(SEEDED_TEST_PASSWORD);
  const userId = createUserId();
  const name = "Usuario Test Veramed";

  store.users[userId] = {
    id: userId,
    name,
    email: seededEmail,
    profile: createDefaultProfile(name, seededEmail, {
      rut: "11.111.111-1",
      phone: "+56911111111",
      address: "Santiago, Chile",
    }),
    passwordHash: hash,
    passwordSalt: salt,
    createdAt: now,
    updatedAt: now,
  };
  store.userIdsByEmail[seededEmail] = userId;
}

async function withStore<T>(updater: (store: AuthStore) => T | Promise<T>) {
  const store = await readStore();
  ensureSeedAndMigrations(store);
  const result = await updater(store);
  await writeStore(store);
  return result;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createUserId() {
  return `usr_${randomBytes(8).toString("hex")}`;
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

function serializeUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    profile: user.profile,
  };
}

function purgeExpiredSessions(store: AuthStore) {
  const now = Date.now();

  for (const [token, session] of Object.entries(store.sessions)) {
    if (session.expiresAt <= now) {
      delete store.sessions[token];
    }
  }
}

export async function registerUser(payload: {
  name: string;
  email: string;
  password: string;
}) {
  return withStore((store) => {
    purgeExpiredSessions(store);

    const email = normalizeEmail(payload.email);
    if (store.userIdsByEmail[email]) {
      return { error: "Ya existe una cuenta con ese correo." } as const;
    }

    const now = Date.now();
    const { hash, salt } = hashPassword(payload.password);
    const userId = createUserId();

    const user: UserRecord = {
      id: userId,
      name: payload.name.trim(),
      email,
      profile: createDefaultProfile(payload.name.trim(), email),
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: now,
      updatedAt: now,
    };

    const token = createSessionToken();
    const session: SessionRecord = {
      token,
      userId,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
    };

    store.users[userId] = user;
    store.userIdsByEmail[email] = userId;
    store.sessions[token] = session;

    return {
      user: serializeUser(user),
      session,
    };
  });
}

export async function loginUser(payload: { email: string; password: string }) {
  return withStore((store) => {
    purgeExpiredSessions(store);

    const email = normalizeEmail(payload.email);
    const userId = store.userIdsByEmail[email];
    if (!userId) {
      return { error: "Correo o contraseña inválidos." } as const;
    }

    const user = store.users[userId];
    if (!user || !verifyPassword(payload.password, user.passwordHash, user.passwordSalt)) {
      return { error: "Correo o contraseña inválidos." } as const;
    }

    const now = Date.now();
    const token = createSessionToken();
    const session: SessionRecord = {
      token,
      userId: user.id,
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
    };

    store.sessions[token] = session;

    return {
      user: serializeUser(user),
      session,
    };
  });
}

export async function getUserFromSession(token: string | undefined) {
  if (!token) {
    return null;
  }

  return withStore((store) => {
    purgeExpiredSessions(store);

    const session = store.sessions[token];
    if (!session) {
      return null;
    }

    const user = store.users[session.userId];
    if (!user) {
      delete store.sessions[token];
      return null;
    }

    return serializeUser(user);
  });
}

export async function logoutSession(token: string | undefined) {
  if (!token) {
    return;
  }

  await withStore((store) => {
    delete store.sessions[token];
  });
}

export async function syncUserProfileFromPatient(userId: string, patient: PatientDetails) {
  return withStore((store) => {
    const user = store.users[userId];
    if (!user) {
      return null;
    }

    const previousEmail = user.email;
    const nextEmail = normalizeEmail(patient.email.trim() || user.profile.email || user.email);
    user.profile = {
      fullName: patient.fullName.trim() || user.profile.fullName,
      rut: patient.rut.trim() || user.profile.rut,
      birthDate: patient.birthDate || user.profile.birthDate,
      email: nextEmail,
      phone: patient.phone.trim() || user.profile.phone,
      address: patient.address.trim() || user.profile.address,
    };
    user.name = user.profile.fullName || user.name;
    user.email = nextEmail;
    user.updatedAt = Date.now();
    if (previousEmail !== user.email) {
      delete store.userIdsByEmail[previousEmail];
    }
    store.userIdsByEmail[user.email] = user.id;

    return serializeUser(user);
  });
}

export async function ensureSeededTestUser() {
  await withStore(() => undefined);
}

export async function getUserById(userId: string) {
  return withStore((store) => {
    const user = store.users[userId];
    return user ? serializeUser(user) : null;
  });
}

export function getSessionTtlMs() {
  return SESSION_TTL_MS;
}
