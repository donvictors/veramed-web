type StepperProps = {
  currentStep: 1 | 2 | 3;
};

const steps = [
  { number: 1, label: "Datos" },
  { number: 2, label: "Recomendación" },
  { number: 3, label: "Validación" },
] as const;

export default function Stepper({ currentStep }: StepperProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {steps.map((step, index) => {
          const state =
            currentStep === step.number
              ? "current"
              : currentStep > step.number
                ? "complete"
                : "upcoming";

          return (
            <div key={step.number} className="flex flex-1 items-center gap-3">
              <div
                className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold ${
                  state === "current"
                    ? "bg-slate-950 text-white"
                    : state === "complete"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {state === "complete" ? "✓" : step.number}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Paso {step.number}
                </p>
                <p className="text-sm font-semibold text-slate-900">{step.label}</p>
              </div>
              {index < steps.length - 1 && (
                <div className="hidden h-px flex-1 bg-slate-200 md:block" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
