export type MedicalNameFields = {
  firstName: string;
  paternalSurname: string;
  maternalSurname: string;
};

export function splitMedicalPortalName(fullName: string): MedicalNameFields {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", paternalSurname: "", maternalSurname: "" };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], paternalSurname: "", maternalSurname: "" };
  }
  if (parts.length === 2) {
    return { firstName: parts[0], paternalSurname: parts[1], maternalSurname: "" };
  }
  return {
    firstName: parts.slice(0, -2).join(" "),
    paternalSurname: parts.at(-2) ?? "",
    maternalSurname: parts.at(-1) ?? "",
  };
}

export function joinMedicalPortalName(fields: MedicalNameFields) {
  return [fields.firstName, fields.paternalSurname, fields.maternalSurname]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
}

export function medicalPortalInitials(fields: MedicalNameFields) {
  const firstInitial = fields.firstName.trim().charAt(0);
  const surnameInitial = (fields.paternalSurname.trim() || fields.maternalSurname.trim()).charAt(0);
  return `${firstInitial}${surnameInitial}`.toUpperCase() || "VM";
}

