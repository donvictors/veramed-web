import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedPath = path.join(__dirname, "../../data/uspstf/checkup-preventive-exams.seed.json");
const rawSeed = readFileSync(seedPath, "utf8");
const seed = JSON.parse(rawSeed);

export const CHECKUP_PREVENTIVE_ENGINE_VERSION = "uspstf-ab-exams-cl-2026-03-04-v1";

const seedById = new Map(seed.items.map((item) => [item.id, item]));

const catalog = {
  AAA_ULTRASOUND: {
    code: "IMG-AAA-US",
    name: "Ecografía aorta abdominal",
    prep: "No requiere preparación especial."
  },
  URINE_CULTURE: {
    code: "LAB-UROCULT",
    name: "Urocultivo",
    prep: "Idealmente usar muestra de orina de la mañana o retener al menos 3 horas."
  },
  PAP: {
    code: "PROC-PAP",
    name: "Papanicolau",
    prep: "Evitar relaciones sexuales, óvulos vaginales y duchas vaginales durante 48 horas previas."
  },
  HPV: {
    code: "LAB-HPV",
    name: "HPV",
    prep: "Evitar relaciones sexuales, óvulos vaginales y duchas vaginales durante 48 horas previas."
  },
  CT_NG_NAAT: {
    code: "LAB-NAAT-CTNG",
    name: "NAAT CT/NG",
    prep: "Seguir indicaciones según tipo de muestra; idealmente no orinar 1 hora antes si es muestra urinaria."
  },
  FIT: {
    code: "LAB-FIT",
    name: "FIT",
    prep: "Seguir instrucciones de toma de muestra de deposición entregadas por el laboratorio."
  },
  OGTT: {
    code: "LAB-OGTT",
    name: "PTGO/OGTT",
    prep: "Ayuno de 8 a 12 horas antes del examen."
  },
  HBSAG: {
    code: "LAB-HBSAG",
    name: "HBsAg",
    prep: "No requiere ayuno."
  },
  ANTI_HCV: {
    code: "LAB-ANTI-HCV",
    name: "Anti-HCV",
    prep: "No requiere ayuno."
  },
  HIV: {
    code: "LAB-VIH",
    name: "VIH",
    prep: "No requiere ayuno."
  },
  IGRA: {
    code: "LAB-IGRA",
    name: "IGRA",
    prep: "No requiere ayuno."
  },
  LOW_DOSE_CT: {
    code: "IMG-TAC-TB",
    name: "TAC tórax baja dosis",
    prep: "No requiere preparación especial."
  },
  DXA: {
    code: "IMG-DXA",
    name: "Densitometría ósea (DXA)",
    prep: "Evitar suplementos de calcio el mismo día, salvo indicación distinta."
  },
  GLUCOSE: {
    code: "LAB-GLICEMIA",
    name: "Glicemia",
    prep: "Ayuno de 8 a 12 horas."
  },
  HBA1C: {
    code: "LAB-HBA1C",
    name: "HbA1c",
    prep: "No requiere ayuno."
  },
  SYPHILIS: {
    code: "LAB-SIFILIS",
    name: "VDRL/RPR + confirmatorio",
    prep: "No requiere ayuno."
  }
};

function isBooleanOrUndefined(value) {
  return typeof value === "boolean" || typeof value === "undefined";
}

function isNumberOrUndefined(value) {
  return typeof value === "number" || typeof value === "undefined";
}

export function validateCheckupPreventiveInput(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return {
      ok: false,
      errors: ["El cuerpo debe ser un objeto JSON."]
    };
  }

  if (!Number.isInteger(payload.age)) {
    errors.push("age debe ser un entero.");
  } else if (payload.age < 15 || payload.age > 120) {
    errors.push("age debe estar entre 15 y 120 para este módulo.");
  }

  if (payload.sex !== "Male" && payload.sex !== "Female") {
    errors.push('sex debe ser "Male" o "Female".');
  }

  if (!isBooleanOrUndefined(payload.pregnant)) {
    errors.push("pregnant debe ser boolean.");
  }
  if (!isBooleanOrUndefined(payload.sexuallyActive)) {
    errors.push("sexuallyActive debe ser boolean.");
  }
  if (!isBooleanOrUndefined(payload.everSmoked)) {
    errors.push("everSmoked debe ser boolean.");
  }
  if (!isBooleanOrUndefined(payload.currentSmoker)) {
    errors.push("currentSmoker debe ser boolean.");
  }
  if (!isBooleanOrUndefined(payload.quitWithin15Years)) {
    errors.push("quitWithin15Years debe ser boolean.");
  }
  if (!isBooleanOrUndefined(payload.overweightOrObese)) {
    errors.push("overweightOrObese debe ser boolean.");
  }
  if (!isBooleanOrUndefined(payload.postmenopausal)) {
    errors.push("postmenopausal debe ser boolean.");
  }
  if (!isBooleanOrUndefined(payload.osteoporosisRiskFactors)) {
    errors.push("osteoporosisRiskFactors debe ser boolean.");
  }
  if (!isBooleanOrUndefined(payload.ltbiIncreasedRisk)) {
    errors.push("ltbiIncreasedRisk debe ser boolean.");
  }
  if (!isBooleanOrUndefined(payload.hbvIncreasedRisk)) {
    errors.push("hbvIncreasedRisk debe ser boolean.");
  }
  if (!isBooleanOrUndefined(payload.syphilisIncreasedRisk)) {
    errors.push("syphilisIncreasedRisk debe ser boolean.");
  }

  if (!isNumberOrUndefined(payload.smokingPackYears) || (typeof payload.smokingPackYears === "number" && payload.smokingPackYears < 0)) {
    errors.push("smokingPackYears debe ser un número mayor o igual a 0.");
  }
  if (!isNumberOrUndefined(payload.bmi) || (typeof payload.bmi === "number" && payload.bmi <= 0)) {
    errors.push("bmi debe ser un número positivo.");
  }
  if (!isNumberOrUndefined(payload.gestationWeeks) || (typeof payload.gestationWeeks === "number" && payload.gestationWeeks < 0)) {
    errors.push("gestationWeeks debe ser un número mayor o igual a 0.");
  }

  if (payload.sex === "Male" && payload.pregnant === true) {
    errors.push("pregnant no puede ser true cuando sex es Male.");
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    value: {
      age: payload.age,
      sex: payload.sex,
      pregnant: payload.pregnant === true,
      gestationWeeks: typeof payload.gestationWeeks === "number" ? payload.gestationWeeks : null,
      sexuallyActive: payload.sexuallyActive === true,
      everSmoked: payload.everSmoked === true,
      currentSmoker: payload.currentSmoker === true,
      smokingPackYears: typeof payload.smokingPackYears === "number" ? payload.smokingPackYears : 0,
      quitWithin15Years: payload.quitWithin15Years === true,
      bmi: typeof payload.bmi === "number" ? payload.bmi : null,
      overweightOrObese: payload.overweightOrObese === true,
      postmenopausal: payload.postmenopausal === true,
      osteoporosisRiskFactors: payload.osteoporosisRiskFactors === true,
      ltbiIncreasedRisk: payload.ltbiIncreasedRisk === true,
      hbvIncreasedRisk: payload.hbvIncreasedRisk === true,
      syphilisIncreasedRisk: payload.syphilisIncreasedRisk === true
    }
  };
}

function createSource(itemId) {
  const item = seedById.get(itemId);
  return {
    topic: item.topic,
    grade: item.grade,
    release_date: item.release_date
  };
}

function pushRecommendation(matches, exam, reason, sourceId) {
  matches.push({
    exam,
    reason,
    uspstf_source: createSource(sourceId)
  });
}

function dedupeRecommendations(matches) {
  const grouped = new Map();

  for (const match of matches) {
    const current = grouped.get(match.exam.code);
    if (!current) {
      grouped.set(match.exam.code, {
        code: match.exam.code,
        name: match.exam.name,
        prep: match.exam.prep,
        reason: match.reason,
        uspstf_sources: [match.uspstf_source]
      });
      continue;
    }

    const reasons = new Set(current.reason.split(" | "));
    reasons.add(match.reason);
    current.reason = Array.from(reasons).join(" | ");

    const existingSourceKey = new Set(
      current.uspstf_sources.map((source) => `${source.topic}:${source.release_date}:${source.grade}`)
    );
    const nextSourceKey = `${match.uspstf_source.topic}:${match.uspstf_source.release_date}:${match.uspstf_source.grade}`;
    if (!existingSourceKey.has(nextSourceKey)) {
      current.uspstf_sources.push(match.uspstf_source);
    }
  }

  return Array.from(grouped.values());
}

export function buildCheckupPreventiveRecommendation(input) {
  const matches = [];

  if (input.sex === "Male" && input.age >= 65 && input.age <= 75 && input.everSmoked) {
    pushRecommendation(
      matches,
      catalog.AAA_ULTRASOUND,
      "Cumple criterio USPSTF para tamizaje único de aneurisma de aorta abdominal por antecedente de tabaquismo.",
      "uspstf_exam_aaa_2019_12"
    );
  }

  if (input.sex === "Female" && input.pregnant) {
    pushRecommendation(
      matches,
      catalog.URINE_CULTURE,
      "Embarazo: corresponde tamizaje de bacteriuria asintomática con urocultivo.",
      "uspstf_exam_asb_preg_2019_09"
    );
  }

  if (input.sex === "Female" && input.age >= 21 && input.age <= 65) {
    pushRecommendation(
      matches,
      catalog.PAP,
      input.age < 30
        ? "Tamizaje cervical indicado entre 21 y 29 años con citología."
        : "Tamizaje cervical indicado entre 30 y 65 años; se puede incluir citología como parte del esquema.",
      "uspstf_exam_cervical_2018_08"
    );

    if (input.age >= 30) {
      pushRecommendation(
        matches,
        catalog.HPV,
        "Tamizaje cervical entre 30 y 65 años: puede incluir prueba de HPV.",
        "uspstf_exam_cervical_2018_08"
      );
    }
  }

  if (input.sex === "Female" && input.sexuallyActive) {
    pushRecommendation(
      matches,
      catalog.CT_NG_NAAT,
      "Actividad sexual declarada en mujer: corresponde tamizaje de clamidia/gonorrea según USPSTF.",
      "uspstf_exam_ct_gc_2021_09"
    );
  }

  if (input.age >= 45 && input.age <= 49) {
    pushRecommendation(
      matches,
      catalog.FIT,
      "Tamizaje colorrectal indicado entre 45 y 49 años; FIT es una alternativa inicial válida.",
      "uspstf_exam_crc_45_49_2021_05"
    );
  } else if (input.age >= 50 && input.age <= 75) {
    pushRecommendation(
      matches,
      catalog.FIT,
      "Tamizaje colorrectal indicado entre 50 y 75 años; FIT es una alternativa inicial válida.",
      "uspstf_exam_crc_50_75_2021_05"
    );
  }

  if (input.sex === "Female" && input.pregnant) {
    if (input.gestationWeeks === null) {
      pushRecommendation(
        matches,
        catalog.OGTT,
        "Embarazo declarado: PTGO/OGTT condicional; corresponde desde las 24 semanas de gestación.",
        "uspstf_exam_gdm_2021_08"
      );
    } else if (input.gestationWeeks >= 24) {
      pushRecommendation(
        matches,
        catalog.OGTT,
        "Embarazo desde 24 semanas o más: corresponde tamizaje de diabetes gestacional con PTGO/OGTT.",
        "uspstf_exam_gdm_2021_08"
      );
    }
  }

  if (input.hbvIncreasedRisk) {
    pushRecommendation(
      matches,
      catalog.HBSAG,
      "Riesgo aumentado para hepatitis B: corresponde tamizaje con serología inicial.",
      "uspstf_exam_hbv_risk_2020_12"
    );
  }

  if (input.sex === "Female" && input.pregnant) {
    pushRecommendation(
      matches,
      catalog.HBSAG,
      "Embarazo: corresponde tamizaje universal de hepatitis B.",
      "uspstf_exam_hbv_preg_2019_07"
    );
  }

  if (input.age >= 18 && input.age <= 79) {
    pushRecommendation(
      matches,
      catalog.ANTI_HCV,
      "Tamizaje de hepatitis C indicado entre 18 y 79 años.",
      "uspstf_exam_hcv_2020_03"
    );
  }

  if ((input.age >= 15 && input.age <= 65) || input.pregnant) {
    pushRecommendation(
      matches,
      catalog.HIV,
      input.pregnant
        ? "Embarazo: corresponde tamizaje de VIH."
        : "Tamizaje de VIH indicado entre 15 y 65 años.",
      input.pregnant ? "uspstf_exam_hiv_preg_2019_06" : "uspstf_exam_hiv_15_65_2019_06"
    );
  }

  if (input.ltbiIncreasedRisk && input.age >= 18) {
    pushRecommendation(
      matches,
      catalog.IGRA,
      "Riesgo aumentado de tuberculosis latente: corresponde tamizaje con IGRA.",
      "uspstf_exam_ltbi_2023_05"
    );
  }

  if (
    input.age >= 50 &&
    input.age <= 80 &&
    input.smokingPackYears >= 20 &&
    (input.currentSmoker || input.quitWithin15Years)
  ) {
    pushRecommendation(
      matches,
      catalog.LOW_DOSE_CT,
      "Cumple criterio de tabaquismo para tamizaje de cáncer pulmonar con TAC de baja dosis.",
      "uspstf_exam_lung_ca_2021_03"
    );
  }

  if (
    input.sex === "Female" &&
    (
      input.age >= 65 ||
      (input.age < 65 && input.postmenopausal && input.osteoporosisRiskFactors)
    )
  ) {
    pushRecommendation(
      matches,
      catalog.DXA,
      input.age >= 65
        ? "Mujer de 65 años o más: corresponde tamizaje de osteoporosis con densitometría."
        : "Mujer postmenopáusica menor de 65 años con factores de riesgo: corresponde densitometría.",
      input.age >= 65
        ? "uspstf_exam_osteoporosis_65plus_2025_01"
        : "uspstf_exam_osteoporosis_postmeno_risk_2025_01"
    );
  }

  if (
    input.age >= 35 &&
    input.age <= 70 &&
    (input.overweightOrObese || (input.bmi !== null && input.bmi >= 25))
  ) {
    pushRecommendation(
      matches,
      catalog.GLUCOSE,
      "Edad y estado nutricional compatibles con tamizaje de prediabetes/diabetes tipo 2.",
      "uspstf_exam_prediabetes_dm2_2021_08"
    );
    pushRecommendation(
      matches,
      catalog.HBA1C,
      "Edad y estado nutricional compatibles con tamizaje de prediabetes/diabetes tipo 2.",
      "uspstf_exam_prediabetes_dm2_2021_08"
    );
  }

  if (input.sex === "Female" && input.pregnant) {
    pushRecommendation(
      matches,
      catalog.SYPHILIS,
      "Embarazo: corresponde tamizaje universal de sífilis.",
      "uspstf_exam_syph_preg_2025_05"
    );
  } else if (input.syphilisIncreasedRisk) {
    pushRecommendation(
      matches,
      catalog.SYPHILIS,
      "Riesgo aumentado de sífilis: corresponde tamizaje serológico.",
      "uspstf_exam_syph_risk_2022_09"
    );
  }

  return {
    exams: dedupeRecommendations(matches),
    engine_version: CHECKUP_PREVENTIVE_ENGINE_VERSION
  };
}

export function getCheckupPreventiveSeedMetadata() {
  return seed.source;
}
