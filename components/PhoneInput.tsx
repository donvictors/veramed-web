"use client";

import { useId, useMemo, useState } from "react";
import { composePhoneValue, parsePhoneValue, PHONE_COUNTRIES } from "@/lib/phone";

type PhoneInputProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
};

export default function PhoneInput({
  value,
  onChange,
  label = "Celular",
  className = "",
  disabled = false,
}: PhoneInputProps) {
  const inputId = useId();
  const countryId = useId();
  const [preferredCountryIso2, setPreferredCountryIso2] = useState(
    () => parsePhoneValue(value).country.iso2,
  );
  const parsed = useMemo(
    () => parsePhoneValue(value, preferredCountryIso2),
    [preferredCountryIso2, value],
  );
  const country = parsed.country;

  function handleCountryChange(nextIso2: string) {
    const nextCountry =
      PHONE_COUNTRIES.find((candidate) => candidate.iso2 === nextIso2) ?? PHONE_COUNTRIES[0];
    setPreferredCountryIso2(nextCountry.iso2);
    onChange(composePhoneValue(nextCountry, parsed.nationalNumber));
  }

  return (
    <div className={`grid gap-2 ${className}`}>
      <label htmlFor={inputId} className="text-sm font-medium text-slate-900">
        {label}
      </label>
      <div className="flex min-w-0 overflow-hidden rounded-xl border border-slate-300 bg-white text-sm text-slate-900 transition focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200">
        <label htmlFor={countryId} className="sr-only">
          Código de país
        </label>
        <select
          id={countryId}
          aria-label="Código de país"
          className="w-[9.25rem] shrink-0 cursor-pointer border-r border-slate-300 bg-slate-50 px-3 py-2.5 outline-none disabled:cursor-not-allowed disabled:text-slate-400"
          value={country.iso2}
          onChange={(event) => handleCountryChange(event.target.value)}
          disabled={disabled}
        >
          {PHONE_COUNTRIES.map((option) => (
            <option key={option.iso2} value={option.iso2}>
              {option.flag} {option.callingCode} · {option.name}
            </option>
          ))}
        </select>
        <input
          id={inputId}
          className="min-w-0 flex-1 bg-white px-3 py-2.5 outline-none placeholder:text-slate-400/70 disabled:cursor-not-allowed disabled:bg-slate-50"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={parsed.nationalNumber}
          onChange={(event) => onChange(composePhoneValue(country, event.target.value))}
          placeholder={country.example}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
