import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_SESSION_COOKIE } from "@/lib/auth";
import { isValidRut } from "@/lib/checkup";
import { getUserFromSession, updateUserProfile } from "@/lib/server/auth-store";

type UpdateProfilePayload = {
  firstName?: string;
  paternalSurname?: string;
  maternalSurname?: string;
  rut?: string;
  birthDate?: string;
  email?: string;
  phone?: string;
  address?: string;
};

function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime());
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_SESSION_COOKIE)?.value;
  const user = await getUserFromSession(token);

  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let payload: UpdateProfilePayload;
  try {
    payload = (await request.json()) as UpdateProfilePayload;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const firstName = (payload.firstName ?? "").trim();
  const paternalSurname = (payload.paternalSurname ?? "").trim();
  const maternalSurname = (payload.maternalSurname ?? "").trim();
  const rut = (payload.rut ?? "").trim();
  const birthDate = (payload.birthDate ?? "").trim();
  const email = (payload.email ?? "").trim();
  const phone = (payload.phone ?? "").trim();
  const address = (payload.address ?? "").trim();

  const errors: string[] = [];
  if (!firstName) errors.push("El nombre es obligatorio.");
  if (!paternalSurname) errors.push("El apellido paterno es obligatorio.");
  if (!maternalSurname) errors.push("El apellido materno es obligatorio.");
  if (!rut) {
    errors.push("El RUT es obligatorio.");
  } else if (!isValidRut(rut)) {
    errors.push("El RUT no es válido.");
  }
  if (!birthDate) {
    errors.push("La fecha de nacimiento es obligatoria.");
  } else if (!isValidDateString(birthDate)) {
    errors.push("La fecha de nacimiento no es válida.");
  }
  if (!email) {
    errors.push("El correo es obligatorio.");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("El correo no es válido.");
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: "Hay errores de validación.", details: errors }, { status: 400 });
  }

  const updated = await updateUserProfile(user.id, {
    firstName,
    paternalSurname,
    maternalSurname,
    rut,
    birthDate,
    email,
    phone,
    address,
  });

  if (!updated) {
    return NextResponse.json({ error: "No encontramos la cuenta." }, { status: 404 });
  }

  return NextResponse.json({ user: updated });
}

