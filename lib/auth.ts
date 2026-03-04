export const AUTH_SESSION_COOKIE = "veramed_session";

export type AuthFormPayload = {
  name?: string;
  email: string;
  password: string;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  createdAt: number;
  profile: {
    fullName: string;
    rut: string;
    birthDate: string;
    email: string;
    phone: string;
    address: string;
  };
};

export function validateRegisterInput(payload: AuthFormPayload) {
  const errors: string[] = [];

  if (!payload.name || payload.name.trim().length < 2) {
    errors.push("El nombre debe tener al menos 2 caracteres.");
  }

  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) {
    errors.push("Ingresa un correo válido.");
  }

  if (!payload.password || payload.password.length < 6) {
    errors.push("La contraseña debe tener al menos 6 caracteres.");
  }

  return errors;
}

export function validateLoginInput(payload: AuthFormPayload) {
  const errors: string[] = [];

  if (!payload.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) {
    errors.push("Ingresa un correo válido.");
  }

  if (!payload.password || payload.password.length < 6) {
    errors.push("La contraseña debe tener al menos 6 caracteres.");
  }

  return errors;
}
