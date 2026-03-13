import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateFlow } from "@/lib/clinical/engine";

describe("clinical engine", () => {
  it("devuelve no_routine_exams en flujo leve sin red flags", () => {
    const result = evaluateFlow("sore_throat", {
      fever: false,
      severe_throat_pain: false,
      difficulty_breathing: false,
      unable_swallow_saliva: false,
      muffled_voice: false,
      marked_systemic_illness: false,
    });

    assert.equal(result.hardStopTriggered, false);
    assert.deepEqual(result.suggestedExams, ["no_routine_exams"]);
    assert.equal(result.nextStep, "continue_flow");
  });

  it("corta flujo con hard stop en dolor torácico", () => {
    const result = evaluateFlow("chest_pain", {
      pain_at_rest: true,
      pain_over_20min: true,
      radiation_arm_jaw: false,
      shortness_of_breath: false,
      diaphoresis: false,
      syncope: false,
    });

    assert.equal(result.hardStopTriggered, true);
    assert.equal(result.nextStep, "show_emergency_warning");
    assert.equal(result.suggestedExams.length, 0);
  });

  it("flujo urinario sugiere urinalysis en escenario no complicado", () => {
    const result = evaluateFlow("dysuria_lower_uti", {
      dysuria: true,
      urinary_frequency: true,
      urgency: true,
      fever: false,
      flank_pain: false,
      urinary_retention: false,
      pregnancy_possible: false,
    });

    assert.equal(result.hardStopTriggered, false);
    assert.ok(result.suggestedExams.includes("urinalysis"));
    assert.ok(result.suggestedExams.includes("urine_culture"));
  });

  it("amenorrea sugiere siempre test de embarazo", () => {
    const result = evaluateFlow("amenorrhea_menstrual_delay", {
      menstrual_delay: true,
      pregnancy_possible: false,
      pelvic_pain: false,
      vaginal_bleeding: false,
      delay_over_3months: false,
    });

    assert.equal(result.hardStopTriggered, false);
    assert.ok(result.suggestedExams.includes("pregnancy_test"));
  });

  it("ansiedad con suicidal_ideation dispara warning de emergencia", () => {
    const result = evaluateFlow("anxiety_panic_insomnia_low_mood", {
      suicidal_ideation: true,
      psychosis_symptoms: false,
      severe_agitation: false,
      unable_self_care: false,
    });

    assert.equal(result.hardStopTriggered, true);
    assert.equal(result.hardStopSeverity, "emergency");
    assert.equal(result.nextStep, "show_emergency_warning");
  });
});

