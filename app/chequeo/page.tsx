"use client";

import { useMemo, useState } from "react";

type Sex = "M" | "F";
type Smoking = "never" | "former" | "current";
type SexualActivity = "yes" | "no";
type Pregnancy = "yes" | "no" | "unknown";

type CheckupInput = {
  age: number;
  sex: Sex;
  weightKg: number;
  heightCm: number;
  smoking: Smoking;
  sexualActivity: SexualActivity;
  pregnancy: Pregnancy;
};

type TestItem = { name: string; why: string };

function recommend(input: CheckupInput): { summary: string; tests: TestItem[]; notes: string[] } {
  // MVP simple y seguro
  if (input.sex === "F" && input.pregnancy === "yes") {
    return {
      summary: "Embarazo declarado: recomendamos control prenatal formal.",
      tests: [{ name: "Control prenatal", why: "El panel depende de edad gestacional y antecedentes." }],
      notes: ["Si hay dolor, sangrado o fiebre: consulta urgencia."],
    };
  }

  const tests: TestItem[] = [
    { name: "Hemograma", why: "Pesquisa anemia e infecciones frecuentes." },
    { name: "Perfil bioquímico (renal/electrolitos)", why: "Línea basal de función renal y electrolitos." },
    { name: "Glicemia en ayunas", why: "Pesquisa alteraciones de glucosa." },
    { name: "Orina completa", why: "Pesquisa infecciones y alteraciones urinarias." },
  ];

  if (input.age >= 40) {
    tests.push({ name: "Perfil lipídico", why: "Estratificación de riesgo cardiovascular." });
    tests.push({ name: "TSH", why: "Pesquisa disfunción tiroidea (más prevalente con la edad)." });
  }
  if (input.age >= 60) {
    tests.push({ name: "HbA1c", why: "Pesquisa alteraciones crónicas de glucosa." });
  }

  const notes: string[] = [];
  if (input.smoking !== "never") notes.push("Por tabaco: priorizar prevención CV y consejería de cesación.");
  if (input.sexualActivity === "yes") notes.push("Opcional: panel ITS según preferencia y contexto.");
  notes.push("Esto no es diagnóstico. Si tienes síntomas, consulta.");

  const summary =
    input.age < 40
      ? "Chequeo preventivo básico."
      : input.age < 60
      ? "Chequeo cardiometabólico ampliado."
      : "Chequeo ampliado para adulto mayor.";

  return { summary, tests, notes };
}

export default function CheckupPage() {
  const [age, setAge] = useState(30);
  const [sex, setSex] = useState<Sex>("M");
  const [weightKg, setWeightKg] = useState(75);
  const [heightCm, setHeightCm] = useState(175);
  const [smoking, setSmoking] = useState<Smoking>("never");
  const [sexualActivity, setSexualActivity] = useState<SexualActivity>("no");
  const [pregnancy, setPregnancy] = useState<Pregnancy>("no");

  const input: CheckupInput = useMemo(
    () => ({ age, sex, weightKg, heightCm, smoking, sexualActivity, pregnancy }),
    [age, sex, weightKg, heightCm, smoking, sexualActivity, pregnancy]
  );

  const rec = useMemo(() => recommend(input), [input]);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">Chequeo preventivo</h1>
        <p className="mt-2 text-slate-600">Formulario breve → recomendación guiada (MVP).</p>

        <div className="mt-8 grid gap-6 rounded-2xl border bg-white p-6 shadow-sm">
          <Field label="Edad">
            <input className={inputCls} type="number" min={18} max={120} value={age} onChange={(e) => setAge(Number(e.target.value))} />
          </Field>

          <Field label="Sexo (biológico)">
            <select className={inputCls} value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
            </select>
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Peso (kg)">
              <input className={inputCls} type="number" min={30} max={300} value={weightKg} onChange={(e) => setWeightKg(Number(e.target.value))} />
            </Field>
            <Field label="Talla (cm)">
              <input className={inputCls} type="number" min={120} max={230} value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} />
            </Field>
          </div>

          <Field label="Tabaco">
            <select className={inputCls} value={smoking} onChange={(e) => setSmoking(e.target.value as Smoking)}>
              <option value="never">Nunca</option>
              <option value="former">Ex fumador</option>
              <option value="current">Fumador actual</option>
            </select>
          </Field>

          <Field label="Actividad sexual">
            <select className={inputCls} value={sexualActivity} onChange={(e) => setSexualActivity(e.target.value as SexualActivity)}>
              <option value="no">No</option>
              <option value="yes">Sí</option>
            </select>
          </Field>

          {sex === "F" && (
            <Field label="Embarazo (si aplica)">
              <select className={inputCls} value={pregnancy} onChange={(e) => setPregnancy(e.target.value as Pregnancy)}>
                <option value="no">No</option>
                <option value="yes">Sí</option>
                <option value="unknown">No estoy segura</option>
              </select>
            </Field>
          )}

          <div className="rounded-xl border bg-slate-50 p-4">
            <p className="text-sm font-medium">Recomendación</p>
            <p className="mt-1 text-sm text-slate-600">{rec.summary}</p>

            <div className="mt-4 grid gap-3">
              {rec.tests.map((t) => (
                <div key={t.name} className="rounded-xl border bg-white p-4">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{t.why}</p>
                </div>
              ))}
            </div>

            {rec.notes.length > 0 && (
              <ul className="mt-4 list-disc pl-5 text-sm text-slate-700">
                {rec.notes.map((n, idx) => (
                  <li key={idx}>{n}</li>
                ))}
              </ul>
            )}
          </div>

          <button
  onClick={() => {
    localStorage.setItem("veramed_checkup", JSON.stringify({ input, rec }));
    window.location.href = "/chequeo/resumen";
  }}
  className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
>
  Aprobar y continuar
</button>

          <p className="text-xs text-slate-500">
            No usar en urgencias. Esto es un MVP sin pago ni validación real todavía.
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200";