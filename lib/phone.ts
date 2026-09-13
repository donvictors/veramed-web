export type PhoneCountry = {
  iso2: string;
  name: string;
  callingCode: string;
  flag: string;
  example: string;
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso2: "CL", name: "Chile", callingCode: "+56", flag: "🇨🇱", example: "912345678" },
  { iso2: "AR", name: "Argentina", callingCode: "+54", flag: "🇦🇷", example: "91123456789" },
  { iso2: "BO", name: "Bolivia", callingCode: "+591", flag: "🇧🇴", example: "71234567" },
  { iso2: "BR", name: "Brasil", callingCode: "+55", flag: "🇧🇷", example: "11912345678" },
  { iso2: "CO", name: "Colombia", callingCode: "+57", flag: "🇨🇴", example: "3123456789" },
  { iso2: "CR", name: "Costa Rica", callingCode: "+506", flag: "🇨🇷", example: "81234567" },
  { iso2: "CU", name: "Cuba", callingCode: "+53", flag: "🇨🇺", example: "51234567" },
  { iso2: "EC", name: "Ecuador", callingCode: "+593", flag: "🇪🇨", example: "991234567" },
  { iso2: "SV", name: "El Salvador", callingCode: "+503", flag: "🇸🇻", example: "71234567" },
  { iso2: "GT", name: "Guatemala", callingCode: "+502", flag: "🇬🇹", example: "51234567" },
  { iso2: "HN", name: "Honduras", callingCode: "+504", flag: "🇭🇳", example: "91234567" },
  { iso2: "MX", name: "México", callingCode: "+52", flag: "🇲🇽", example: "5512345678" },
  { iso2: "NI", name: "Nicaragua", callingCode: "+505", flag: "🇳🇮", example: "81234567" },
  { iso2: "PA", name: "Panamá", callingCode: "+507", flag: "🇵🇦", example: "61234567" },
  { iso2: "PY", name: "Paraguay", callingCode: "+595", flag: "🇵🇾", example: "981123456" },
  { iso2: "PE", name: "Perú", callingCode: "+51", flag: "🇵🇪", example: "912345678" },
  { iso2: "UY", name: "Uruguay", callingCode: "+598", flag: "🇺🇾", example: "91234567" },
  { iso2: "VE", name: "Venezuela", callingCode: "+58", flag: "🇻🇪", example: "4121234567" },
  { iso2: "US", name: "Estados Unidos", callingCode: "+1", flag: "🇺🇸", example: "2025550123" },
  { iso2: "CA", name: "Canadá", callingCode: "+1", flag: "🇨🇦", example: "4165550123" },
  { iso2: "DO", name: "República Dominicana", callingCode: "+1", flag: "🇩🇴", example: "8092345678" },
  { iso2: "PR", name: "Puerto Rico", callingCode: "+1", flag: "🇵🇷", example: "7872345678" },
  { iso2: "ES", name: "España", callingCode: "+34", flag: "🇪🇸", example: "612345678" },
  { iso2: "PT", name: "Portugal", callingCode: "+351", flag: "🇵🇹", example: "912345678" },
  { iso2: "FR", name: "Francia", callingCode: "+33", flag: "🇫🇷", example: "612345678" },
  { iso2: "DE", name: "Alemania", callingCode: "+49", flag: "🇩🇪", example: "15123456789" },
  { iso2: "IT", name: "Italia", callingCode: "+39", flag: "🇮🇹", example: "3123456789" },
  { iso2: "GB", name: "Reino Unido", callingCode: "+44", flag: "🇬🇧", example: "7123456789" },
  { iso2: "AU", name: "Australia", callingCode: "+61", flag: "🇦🇺", example: "412345678" },
  { iso2: "NZ", name: "Nueva Zelanda", callingCode: "+64", flag: "🇳🇿", example: "211234567" },
];

const DEFAULT_COUNTRY = PHONE_COUNTRIES[0];

export function parsePhoneValue(value: string, preferredIso2 = DEFAULT_COUNTRY.iso2) {
  const preferred =
    PHONE_COUNTRIES.find((country) => country.iso2 === preferredIso2) ?? DEFAULT_COUNTRY;
  const trimmed = value.trim();

  if (!trimmed.startsWith("+")) {
    return { country: preferred, nationalNumber: trimmed.replace(/\D/g, "") };
  }

  const matchingCountry = trimmed.startsWith(preferred.callingCode)
    ? preferred
    : [...PHONE_COUNTRIES]
        .sort((left, right) => right.callingCode.length - left.callingCode.length)
        .find((country) => trimmed.startsWith(country.callingCode)) ?? preferred;

  const nationalPart = trimmed.startsWith(matchingCountry.callingCode)
    ? trimmed.slice(matchingCountry.callingCode.length)
    : trimmed;

  return { country: matchingCountry, nationalNumber: nationalPart.replace(/\D/g, "") };
}

export function composePhoneValue(country: PhoneCountry, nationalNumber: string) {
  const digits = nationalNumber.replace(/\D/g, "").slice(0, 15);
  return digits ? `${country.callingCode}${digits}` : "";
}
