import { EXAM_CATALOG_IDS } from "@/lib/clinical/examCatalog";
import {
  clinicalFlowDefinitionSchema,
  type ClinicalFlowDefinition,
  type HardStopAction,
  type KeyQuestion,
} from "@/lib/clinical/types";

const YES_NO_OPTIONS = [
  { label: "Sí", value: "yes" },
  { label: "No", value: "no" },
] as const;

function booleanQuestion(
  id: string,
  text: string,
  options?: {
    required?: boolean;
    helpText?: string;
  },
): KeyQuestion {
  return {
    id,
    text,
    type: "boolean",
    required: options?.required ?? false,
    options: [...YES_NO_OPTIONS],
    helpText: options?.helpText,
  };
}

function durationQuestion(id: string, text: string): KeyQuestion {
  return {
    id,
    text,
    type: "duration",
    required: false,
    options: [
      { label: "< 48 horas", value: "lt_48h" },
      { label: "2-7 días", value: "2_7d" },
      { label: "1-4 semanas", value: "1_4w" },
      { label: "> 4 semanas", value: "gt_4w" },
    ],
  };
}

function hardStopAction(
  severity: "urgent" | "emergency",
  title: string,
  message: string,
  action: HardStopAction["action"] = "redirect_to_urgent_guidance",
): HardStopAction {
  return {
    enabled: true,
    severity,
    title,
    message,
    action,
  };
}

const FLOWS_RAW: ClinicalFlowDefinition[] = [
  {
    flowId: "sore_throat",
    label: "Dolor de garganta",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto comenzaron los síntomas?"),
      booleanQuestion("fever", "¿Has tenido fiebre?"),
      booleanQuestion("severe_throat_pain", "¿El dolor de garganta es intenso y progresivo?"),
      booleanQuestion("difficulty_breathing", "¿Tienes dificultad para respirar?"),
      booleanQuestion("unable_swallow_saliva", "¿No puedes tragar saliva?"),
      booleanQuestion("muffled_voice", "¿Tu voz está muy apagada o gangosa?"),
      booleanQuestion("marked_systemic_illness", "¿Te sientes muy decaído/a o con compromiso general importante?"),
    ],
    redFlags: [
      {
        id: "rf_airway_compromise",
        label: "Compromiso de vía aérea",
        triggerType: "any_yes",
        questionIds: ["difficulty_breathing", "unable_swallow_saliva"],
        severity: "emergency",
        message: "Estos síntomas pueden indicar compromiso de vía aérea.",
      },
      {
        id: "rf_deep_neck_space",
        label: "Sospecha de infección profunda",
        triggerType: "all_yes",
        questionIds: ["muffled_voice", "severe_throat_pain"],
        severity: "urgent",
        message: "Dolor intenso y voz apagada requieren evaluación médica inmediata.",
      },
      {
        id: "rf_systemic_compromise",
        label: "Compromiso sistémico importante",
        triggerType: "any_yes",
        questionIds: ["marked_systemic_illness"],
        severity: "urgent",
        message: "El compromiso general importante no debe manejarse solo por vía ambulatoria digital.",
      },
    ],
    examRules: [
      {
        id: "rule_sore_throat_uncomplicated",
        description: "Cuadro banal de vía aérea superior sin alarmas.",
        unlessAny: [
          "difficulty_breathing",
          "unable_swallow_saliva",
          "muffled_voice",
          "marked_systemic_illness",
        ],
        suggestedExams: ["no_routine_exams"],
        rationale: "En dolor de garganta banal no se recomiendan exámenes de rutina en V1.",
        requiresMedicalReview: false,
      },
    ],
    hardStopAction: hardStopAction(
      "emergency",
      "Síntomas de alerta respiratoria",
      "Este cuadro puede requerir atención inmediata. No continúes por flujo ambulatorio digital.",
      "stop_and_show_warning",
    ),
    nextStep: "continue_flow",
  },
  {
    flowId: "acute_cough",
    label: "Tos aguda",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto empezó la tos?"),
      booleanQuestion("fever", "¿Has tenido fiebre?"),
      booleanQuestion("purulent_sputum", "¿Tienes flema espesa o purulenta?"),
      booleanQuestion("shortness_of_breath", "¿Tienes falta de aire relevante?"),
      booleanQuestion("chest_pain", "¿Tienes dolor torácico importante?"),
      booleanQuestion("hemoptysis", "¿Has expulsado sangre al toser?"),
      booleanQuestion("immunosuppression", "¿Tienes inmunosupresión o tratamiento inmunosupresor?"),
      booleanQuestion("cough_persistent_over_3weeks", "¿La tos lleva más de 3 semanas?"),
    ],
    redFlags: [
      {
        id: "rf_cough_hemoptysis",
        label: "Hemoptisis",
        triggerType: "any_yes",
        questionIds: ["hemoptysis"],
        severity: "emergency",
        message: "La hemoptisis requiere evaluación inmediata.",
      },
      {
        id: "rf_cough_respiratory_distress",
        label: "Compromiso respiratorio significativo",
        triggerType: "any_yes",
        questionIds: ["shortness_of_breath", "chest_pain"],
        severity: "urgent",
        message: "Falta de aire o dolor torácico con tos puede requerir atención urgente.",
      },
    ],
    examRules: [
      {
        id: "rule_cough_uncomplicated",
        description: "Tos aguda no complicada sin criterios de gravedad.",
        unlessAny: [
          "fever",
          "shortness_of_breath",
          "chest_pain",
          "hemoptysis",
          "immunosuppression",
          "cough_persistent_over_3weeks",
        ],
        suggestedExams: ["no_routine_exams"],
        rationale: "En cuadros virales banales no se solicitan exámenes de rutina.",
        requiresMedicalReview: false,
      },
      {
        id: "rule_cough_possible_pneumonia",
        description: "Sospecha clínica de neumonía o cuadro no banal.",
        whenAny: ["fever", "purulent_sputum", "cough_persistent_over_3weeks", "immunosuppression"],
        unlessAny: ["hemoptysis", "shortness_of_breath", "chest_pain"],
        suggestedExams: ["chest_xray", "cbc", "crp"],
        rationale: "Si hay sospecha no banal, se sugiere estudio básico con revisión médica.",
        requiresMedicalReview: true,
      },
    ],
    hardStopAction: hardStopAction(
      "urgent",
      "Tos con señales de alerta",
      "Tus respuestas muestran señales de gravedad que deben evaluarse de forma presencial urgente.",
    ),
    nextStep: "continue_flow",
  },
  {
    flowId: "dyspnea",
    label: "Disnea",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto tienes dificultad para respirar?"),
      booleanQuestion("dyspnea_at_rest", "¿La falta de aire ocurre en reposo?"),
      booleanQuestion("dyspnea_on_exertion", "¿Se presenta principalmente al esfuerzo?"),
      booleanQuestion("unable_full_sentences", "¿Te cuesta hablar frases completas por falta de aire?"),
      booleanQuestion("sudden_onset", "¿Comenzó de forma súbita?"),
      booleanQuestion("chest_pain", "¿Se acompaña de dolor de pecho?"),
      booleanQuestion("fever", "¿Tienes fiebre asociada?"),
      booleanQuestion("leg_swelling", "¿Tienes hinchazón de piernas de inicio reciente?"),
    ],
    redFlags: [
      {
        id: "rf_dyspnea_rest_or_speech",
        label: "Disnea relevante",
        triggerType: "any_yes",
        questionIds: ["dyspnea_at_rest", "unable_full_sentences"],
        severity: "emergency",
        message: "La disnea en reposo o con incapacidad para hablar requiere evaluación inmediata.",
      },
      {
        id: "rf_dyspnea_acute_cardiopulmonary",
        label: "Sospecha cardiopulmonar aguda",
        triggerType: "any_yes",
        questionIds: ["sudden_onset", "chest_pain"],
        severity: "urgent",
        message: "Inicio súbito o dolor torácico junto a disnea no debe continuar por vía ambulatoria digital.",
      },
    ],
    examRules: [
      {
        id: "rule_dyspnea_mild_subacute_review",
        description: "Disnea leve/subaguda seleccionada para estudio inicial ambulatorio.",
        whenAll: ["dyspnea_on_exertion"],
        unlessAny: ["dyspnea_at_rest", "unable_full_sentences", "sudden_onset", "chest_pain"],
        suggestedExams: ["chest_xray", "cbc", "crp", "ecg"],
        rationale: "En casos seleccionados y estables puede iniciarse estudio básico, siempre con revisión médica.",
        requiresMedicalReview: true,
      },
      {
        id: "rule_dyspnea_default_review",
        description: "Disnea sin criterios de alarma pero con necesidad de triaje clínico.",
        unlessAny: ["dyspnea_at_rest", "unable_full_sentences", "sudden_onset", "chest_pain"],
        suggestedExams: ["no_routine_exams"],
        rationale: "Por seguridad, la disnea debe priorizar revisión médica antes de sugerir paneles amplios.",
        requiresMedicalReview: true,
      },
    ],
    hardStopAction: hardStopAction(
      "emergency",
      "Disnea con alto riesgo",
      "Tus respuestas sugieren un cuadro respiratorio potencialmente grave. Busca atención urgente inmediata.",
      "redirect_to_urgent_guidance",
    ),
    nextStep: "clinician_review_before_exams",
  },
  {
    flowId: "chest_pain",
    label: "Dolor torácico",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto comenzó el dolor de pecho?"),
      booleanQuestion("pain_at_rest", "¿El dolor aparece en reposo?"),
      booleanQuestion("pain_over_20min", "¿El dolor dura más de 20 minutos continuos?"),
      booleanQuestion("radiation_arm_jaw", "¿Irradia a brazo, mandíbula o espalda?"),
      booleanQuestion("shortness_of_breath", "¿Se acompaña de falta de aire?"),
      booleanQuestion("diaphoresis", "¿Se acompaña de sudor frío o náuseas intensas?"),
      booleanQuestion("syncope", "¿Tuviste desmayo o casi desmayo?"),
      booleanQuestion("known_cardiovascular_disease", "¿Tienes antecedente cardiovascular relevante?"),
    ],
    redFlags: [
      {
        id: "rf_chest_pain_high_risk",
        label: "Dolor torácico de alto riesgo",
        triggerType: "any_yes",
        questionIds: [
          "pain_at_rest",
          "pain_over_20min",
          "radiation_arm_jaw",
          "shortness_of_breath",
          "diaphoresis",
          "syncope",
        ],
        severity: "emergency",
        message: "Este patrón de dolor torácico debe evaluarse de inmediato.",
      },
    ],
    examRules: [
      {
        id: "rule_chest_pain_no_auto_exams",
        description: "No auto-sugerir exámenes ambulatorios en dolor torácico potencialmente agudo.",
        suggestedExams: ["no_routine_exams"],
        rationale: "Este flujo requiere priorizar evaluación clínica urgente o revisión médica directa.",
        requiresMedicalReview: true,
      },
    ],
    hardStopAction: hardStopAction(
      "emergency",
      "Dolor torácico de posible gravedad",
      "No continúes por flujo ambulatorio. Requiere evaluación de urgencia.",
      "redirect_to_urgent_guidance",
    ),
    nextStep: "clinician_review_before_exams",
  },
  {
    flowId: "palpitations",
    label: "Palpitaciones",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto comenzaron las palpitaciones?"),
      booleanQuestion("irregular_heartbeat_sensation", "¿Sientes latidos irregulares o muy rápidos?"),
      booleanQuestion("chest_pain", "¿Se acompañan de dolor torácico?"),
      booleanQuestion("shortness_of_breath", "¿Se acompañan de falta de aire?"),
      booleanQuestion("syncope", "¿Has tenido desmayo o casi desmayo?"),
      booleanQuestion("stimulant_use", "¿Consumiste estimulantes (energéticas/cafeína alta) recientemente?"),
      booleanQuestion("known_arrhythmia", "¿Tienes antecedente de arritmia?"),
    ],
    redFlags: [
      {
        id: "rf_palpitations_instability",
        label: "Palpitaciones con inestabilidad",
        triggerType: "any_yes",
        questionIds: ["syncope", "chest_pain", "shortness_of_breath"],
        severity: "emergency",
        message: "Palpitaciones con dolor torácico, disnea o síncope requieren evaluación urgente.",
      },
    ],
    examRules: [
      {
        id: "rule_palpitations_ecg",
        description: "ECG como examen base en palpitaciones sin alarmas.",
        whenAny: ["irregular_heartbeat_sensation", "known_arrhythmia"],
        unlessAny: ["syncope", "chest_pain", "shortness_of_breath"],
        suggestedExams: ["ecg"],
        rationale: "El ECG es examen de primera línea en palpitaciones estables.",
        requiresMedicalReview: false,
      },
      {
        id: "rule_palpitations_contextual_labs",
        description: "Evaluación metabólica cuando hay gatillantes clínicos.",
        whenAny: ["stimulant_use"],
        unlessAny: ["syncope", "chest_pain", "shortness_of_breath"],
        suggestedExams: ["electrolytes", "glucose"],
        rationale: "Puede aportar en evaluación inicial de factores precipitantes.",
        requiresMedicalReview: true,
      },
    ],
    hardStopAction: hardStopAction(
      "emergency",
      "Palpitaciones con señales de riesgo",
      "Tus respuestas requieren evaluación inmediata y no deben seguir por un flujo ambulatorio digital.",
    ),
    nextStep: "continue_flow",
  },
  {
    flowId: "headache",
    label: "Cefalea",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto comenzó el dolor de cabeza?"),
      booleanQuestion("sudden_onset", "¿Comenzó de forma súbita (en segundos-minutos)?"),
      booleanQuestion("worst_headache_of_life", "¿Es el peor dolor de cabeza de tu vida?"),
      booleanQuestion("neurologic_deficit", "¿Tienes debilidad, alteración visual o dificultad para hablar?"),
      booleanQuestion("neck_stiffness", "¿Tienes rigidez de cuello importante?"),
      booleanQuestion("altered_consciousness", "¿Tienes confusión o compromiso de conciencia?"),
      booleanQuestion("pregnancy_or_puerperium", "¿Estás embarazada o en puerperio reciente?"),
      booleanQuestion("recurrent_similar_headaches", "¿Has tenido episodios similares previos?"),
    ],
    redFlags: [
      {
        id: "rf_headache_thunderclap",
        label: "Cefalea en trueno",
        triggerType: "all_yes",
        questionIds: ["sudden_onset", "worst_headache_of_life"],
        severity: "emergency",
        message: "Cefalea súbita e intensa requiere evaluación inmediata.",
      },
      {
        id: "rf_headache_neuro",
        label: "Déficit neurológico asociado",
        triggerType: "any_yes",
        questionIds: ["neurologic_deficit", "altered_consciousness", "neck_stiffness"],
        severity: "emergency",
        message: "Signos neurológicos o meníngeos son red flags mayores.",
      },
      {
        id: "rf_headache_pregnancy_alarm",
        label: "Cefalea de alarma en embarazo/puerperio",
        triggerType: "all_yes",
        questionIds: ["pregnancy_or_puerperium", "worst_headache_of_life"],
        severity: "urgent",
        message: "En embarazo/puerperio, cefalea de alarma requiere evaluación inmediata.",
      },
    ],
    examRules: [
      {
        id: "rule_headache_primary_pattern",
        description: "Patrón compatible con cefalea primaria sin alarmas.",
        whenAll: ["recurrent_similar_headaches"],
        unlessAny: [
          "sudden_onset",
          "worst_headache_of_life",
          "neurologic_deficit",
          "neck_stiffness",
          "altered_consciousness",
        ],
        suggestedExams: ["no_routine_exams"],
        rationale: "En cefalea primaria típica no se recomiendan exámenes de rutina iniciales.",
        requiresMedicalReview: false,
      },
      {
        id: "rule_headache_contextual_review",
        description: "Cefalea no claramente primaria, estudio solo bajo revisión médica.",
        unlessAny: [
          "sudden_onset",
          "worst_headache_of_life",
          "neurologic_deficit",
          "neck_stiffness",
          "altered_consciousness",
        ],
        suggestedExams: ["cbc", "crp"],
        rationale: "Solo como apoyo en escenarios seleccionados y no como rutina universal.",
        requiresMedicalReview: true,
      },
    ],
    hardStopAction: hardStopAction(
      "emergency",
      "Cefalea con signos de alarma",
      "Tus respuestas sugieren un cuadro que debe evaluarse de forma urgente.",
    ),
    nextStep: "continue_flow",
  },
  {
    flowId: "dizziness_vertigo",
    label: "Mareo / vértigo",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto comenzó el mareo?"),
      booleanQuestion("spinning_sensation", "¿Sientes giro del entorno (vértigo)?"),
      booleanQuestion("triggered_by_head_movement", "¿Se desencadena al mover la cabeza?"),
      booleanQuestion("lightheadedness", "¿Es más sensación de inestabilidad o desvanecimiento?"),
      booleanQuestion("inability_to_walk", "¿Te impide caminar o mantenerte de pie?"),
      booleanQuestion("neurologic_deficit", "¿Tienes síntomas neurológicos focales?"),
      booleanQuestion("chest_pain", "¿Se acompaña de dolor torácico?"),
      booleanQuestion("syncope", "¿Tuviste desmayo real?"),
    ],
    redFlags: [
      {
        id: "rf_vertigo_neuro",
        label: "Mareo con compromiso neurológico",
        triggerType: "any_yes",
        questionIds: ["neurologic_deficit", "inability_to_walk"],
        severity: "emergency",
        message: "El compromiso neurológico o incapacidad para caminar requiere evaluación urgente.",
      },
      {
        id: "rf_vertigo_cardiovascular",
        label: "Mareo con sospecha cardiovascular",
        triggerType: "any_yes",
        questionIds: ["chest_pain", "syncope"],
        severity: "urgent",
        message: "Dolor torácico o síncope asociado no debe continuar por flujo ambulatorio digital.",
      },
    ],
    examRules: [
      {
        id: "rule_vertigo_bppv_like",
        description: "Vértigo posicional periférico típico sin alarmas.",
        whenAll: ["spinning_sensation", "triggered_by_head_movement"],
        unlessAny: ["inability_to_walk", "neurologic_deficit", "chest_pain", "syncope"],
        suggestedExams: ["no_routine_exams"],
        rationale: "Patrón compatible con VPPB suele no requerir exámenes de rutina.",
        requiresMedicalReview: false,
      },
      {
        id: "rule_vertigo_presyncope_path",
        description: "Patrón de presíncope sugiere ECG en revisión médica.",
        whenAll: ["lightheadedness"],
        unlessAny: ["syncope", "chest_pain", "neurologic_deficit", "inability_to_walk"],
        suggestedExams: ["ecg"],
        rationale: "Si predomina presíncope se puede considerar ECG inicial con validación clínica.",
        requiresMedicalReview: true,
      },
    ],
    hardStopAction: hardStopAction(
      "emergency",
      "Mareo con señales de alerta",
      "Tus respuestas muestran señales que requieren atención presencial urgente.",
    ),
    nextStep: "continue_flow",
  },
  {
    flowId: "syncope_presyncope",
    label: "Síncope / presíncope",
    keyQuestions: [
      durationQuestion("duration", "¿Cuándo ocurrió el episodio?"),
      booleanQuestion("true_syncope", "¿Perdiste totalmente la conciencia?"),
      booleanQuestion("presyncope", "¿Sentiste que te ibas a desmayar sin perder conciencia?"),
      booleanQuestion("injury_during_event", "¿Hubo caída o trauma durante el episodio?"),
      booleanQuestion("chest_pain", "¿Se acompañó de dolor torácico?"),
      booleanQuestion("shortness_of_breath", "¿Se acompañó de falta de aire?"),
      booleanQuestion("palpitations", "¿Se acompañó de palpitaciones?"),
      booleanQuestion("neurologic_deficit", "¿Quedaron síntomas neurológicos después?"),
    ],
    redFlags: [
      {
        id: "rf_syncope_high_risk",
        label: "Síncope de alto riesgo",
        triggerType: "any_yes",
        questionIds: ["true_syncope", "chest_pain", "shortness_of_breath", "neurologic_deficit", "injury_during_event"],
        severity: "emergency",
        message: "Este patrón de síncope/presíncope requiere evaluación urgente.",
      },
    ],
    examRules: [
      {
        id: "rule_syncope_selected_presyncope",
        description: "Presíncope sin alarmas mayores: ECG inicial bajo revisión.",
        whenAll: ["presyncope"],
        unlessAny: ["true_syncope", "chest_pain", "shortness_of_breath", "neurologic_deficit", "injury_during_event"],
        suggestedExams: ["ecg"],
        rationale: "El ECG puede ser útil en presíncope estable seleccionado.",
        requiresMedicalReview: true,
      },
    ],
    hardStopAction: hardStopAction(
      "emergency",
      "Síncope o presíncope de riesgo",
      "No continúes por el flujo ambulatorio digital. Requiere evaluación médica urgente.",
      "redirect_to_urgent_guidance",
    ),
    nextStep: "clinician_review_before_exams",
  },
  {
    flowId: "acute_abdominal_pain",
    label: "Dolor abdominal agudo",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto empezó el dolor abdominal?"),
      booleanQuestion("mild_pain", "¿El dolor es leve y tolerable?"),
      booleanQuestion("severe_progressive_pain", "¿El dolor es intenso y va en aumento?"),
      booleanQuestion("peritoneal_signs", "¿El dolor empeora mucho al moverte o al tocar el abdomen?"),
      booleanQuestion("fever", "¿Has tenido fiebre?"),
      booleanQuestion("persistent_vomiting", "¿Tienes vómitos persistentes?"),
      booleanQuestion("gi_bleeding", "¿Hay sangre en vómito o deposiciones negras/rojizas?"),
      booleanQuestion("pregnancy_with_pain_or_bleeding", "¿Hay posibilidad de embarazo con dolor o sangrado?"),
      booleanQuestion("urinary_symptoms", "¿Tienes ardor al orinar o síntomas urinarios asociados?"),
    ],
    redFlags: [
      {
        id: "rf_abdomen_acute_surgical",
        label: "Abdomen agudo potencial",
        triggerType: "any_yes",
        questionIds: ["severe_progressive_pain", "peritoneal_signs", "gi_bleeding"],
        severity: "emergency",
        message: "Dolor intenso progresivo o signos de irritación peritoneal requieren urgencia.",
      },
      {
        id: "rf_abdomen_pregnancy",
        label: "Dolor abdominal en posible embarazo de riesgo",
        triggerType: "any_yes",
        questionIds: ["pregnancy_with_pain_or_bleeding"],
        severity: "urgent",
        message: "Dolor/sangrado con posibilidad de embarazo requiere evaluación inmediata.",
      },
      {
        id: "rf_abdomen_vomiting",
        label: "Vómitos persistentes",
        triggerType: "any_yes",
        questionIds: ["persistent_vomiting"],
        severity: "urgent",
        message: "Vómitos persistentes pueden requerir manejo urgente.",
      },
    ],
    examRules: [
      {
        id: "rule_abdomen_mild_no_tests",
        description: "Dolor leve sin criterios de alarma.",
        whenAll: ["mild_pain"],
        unlessAny: [
          "severe_progressive_pain",
          "peritoneal_signs",
          "persistent_vomiting",
          "gi_bleeding",
          "pregnancy_with_pain_or_bleeding",
        ],
        suggestedExams: ["no_routine_exams"],
        rationale: "En cuadros leves sin alarma, evitar sobreindicación inicial.",
        requiresMedicalReview: false,
      },
      {
        id: "rule_abdomen_conservative_bundle",
        description: "Bundle abdominal ambulatorio conservador en casos seleccionados.",
        whenAny: ["fever", "urinary_symptoms", "duration"],
        unlessAny: [
          "severe_progressive_pain",
          "peritoneal_signs",
          "persistent_vomiting",
          "gi_bleeding",
          "pregnancy_with_pain_or_bleeding",
        ],
        suggestedExams: [
          "cbc",
          "crp",
          "creatinine",
          "electrolytes",
          "liver_panel",
          "lipase",
          "urinalysis",
          "pregnancy_test",
        ],
        rationale: "Solo para evaluación inicial ambulatoria y siempre sujeta a validación médica.",
        requiresMedicalReview: true,
      },
    ],
    hardStopAction: hardStopAction(
      "emergency",
      "Dolor abdominal con señales de alarma",
      "Tus respuestas sugieren un cuadro que puede requerir evaluación urgente presencial.",
    ),
    nextStep: "continue_flow",
  },
  {
    flowId: "nausea_vomiting",
    label: "Náuseas / vómitos",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto tienes náuseas o vómitos?"),
      booleanQuestion("short_duration_lt_48h", "¿Llevas menos de 48 horas con síntomas?"),
      booleanQuestion("persistent_vomiting", "¿Has vomitado repetidamente sin mejoría?"),
      booleanQuestion("unable_hydrate", "¿No logras hidratarte o retener líquidos?"),
      booleanQuestion("blood_in_vomit", "¿Has vomitado sangre?"),
      booleanQuestion("severe_abdominal_pain", "¿Tienes dolor abdominal intenso?"),
      booleanQuestion("neurologic_symptoms", "¿Tienes cefalea intensa, rigidez de cuello o déficit neurológico?"),
      booleanQuestion("pregnancy_with_pain_or_bleeding", "¿Hay posibilidad de embarazo con dolor o sangrado?"),
    ],
    redFlags: [
      {
        id: "rf_nv_bleeding",
        label: "Hematemesis",
        triggerType: "any_yes",
        questionIds: ["blood_in_vomit"],
        severity: "emergency",
        message: "Vómito con sangre requiere evaluación urgente.",
      },
      {
        id: "rf_nv_severe_context",
        label: "Contexto de mayor gravedad",
        triggerType: "any_yes",
        questionIds: ["unable_hydrate", "severe_abdominal_pain", "neurologic_symptoms", "pregnancy_with_pain_or_bleeding"],
        severity: "urgent",
        message: "El cuadro requiere evaluación presencial urgente.",
      },
    ],
    examRules: [
      {
        id: "rule_nv_short_self_limited",
        description: "Náuseas/vómitos agudos autolimitados sin alarmas.",
        whenAll: ["short_duration_lt_48h"],
        unlessAny: [
          "persistent_vomiting",
          "unable_hydrate",
          "blood_in_vomit",
          "severe_abdominal_pain",
          "neurologic_symptoms",
        ],
        suggestedExams: ["no_routine_exams"],
        rationale: "Evitar exámenes de rutina en cuadros breves sin signos de gravedad.",
        requiresMedicalReview: false,
      },
      {
        id: "rule_nv_contextual_bundle",
        description: "Bundle conservador si persiste o hay contexto clínico relevante.",
        whenAny: ["persistent_vomiting", "duration"],
        unlessAny: ["blood_in_vomit", "severe_abdominal_pain", "unable_hydrate", "neurologic_symptoms"],
        suggestedExams: ["cbc", "creatinine", "electrolytes", "lipase", "urinalysis", "pregnancy_test"],
        rationale: "Evaluación de hidratación, función renal y causas orgánicas seleccionadas.",
        requiresMedicalReview: true,
      },
    ],
    hardStopAction: hardStopAction(
      "urgent",
      "Náuseas/vómitos con señales de alarma",
      "El cuadro no debe continuar por un flujo ambulatorio automático.",
    ),
    nextStep: "continue_flow",
  },
  {
    flowId: "diarrhea",
    label: "Diarrea",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto tienes diarrea?"),
      booleanQuestion("acute_less_3days", "¿Llevas menos de 3 días de diarrea?"),
      booleanQuestion("blood_in_stool", "¿Has visto sangre en deposiciones?"),
      booleanQuestion("high_fever", "¿Has tenido fiebre alta?"),
      booleanQuestion("severe_abdominal_pain", "¿Tienes dolor abdominal intenso?"),
      booleanQuestion("dehydration_signs", "¿Tienes signos de deshidratación (sed intensa, mareo, poca orina)?"),
      booleanQuestion("immunosuppression", "¿Tienes inmunosupresión?"),
      booleanQuestion("stool_frequency_gt6", "¿Tienes más de 6 deposiciones líquidas al día?"),
    ],
    redFlags: [
      {
        id: "rf_diarrhea_dehydration",
        label: "Deshidratación importante",
        triggerType: "any_yes",
        questionIds: ["dehydration_signs"],
        severity: "urgent",
        message: "La deshidratación significativa requiere evaluación presencial.",
      },
      {
        id: "rf_diarrhea_bloody_or_severe_pain",
        label: "Diarrea con sangrado o dolor severo",
        triggerType: "any_yes",
        questionIds: ["blood_in_stool", "severe_abdominal_pain"],
        severity: "urgent",
        message: "Sangrado o dolor severo en diarrea requieren manejo urgente.",
      },
    ],
    examRules: [
      {
        id: "rule_diarrhea_uncomplicated",
        description: "Diarrea aguda no complicada.",
        whenAll: ["acute_less_3days"],
        unlessAny: [
          "blood_in_stool",
          "high_fever",
          "severe_abdominal_pain",
          "dehydration_signs",
          "immunosuppression",
          "stool_frequency_gt6",
        ],
        suggestedExams: ["no_routine_exams"],
        rationale: "Diarrea aguda simple no requiere exámenes de rutina de entrada.",
        requiresMedicalReview: false,
      },
      {
        id: "rule_diarrhea_complicated_context",
        description: "Diarrea con criterios de mayor riesgo o persistencia.",
        whenAny: ["blood_in_stool", "high_fever", "immunosuppression", "stool_frequency_gt6", "duration"],
        unlessAny: ["dehydration_signs", "severe_abdominal_pain"],
        suggestedExams: ["cbc", "creatinine", "electrolytes", "stool_culture"],
        rationale: "Estudio inicial conservador en cuadros seleccionados no críticos.",
        requiresMedicalReview: true,
      },
    ],
    hardStopAction: hardStopAction(
      "urgent",
      "Diarrea con señales de alarma",
      "Tu cuadro podría requerir evaluación urgente presencial.",
    ),
    nextStep: "continue_flow",
  },
  {
    flowId: "constipation",
    label: "Constipación",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto tienes constipación?"),
      booleanQuestion("mild_constipation", "¿El síntoma es leve y sin dolor importante?"),
      booleanQuestion("no_gas_or_stool", "¿No eliminas gases ni deposiciones?"),
      booleanQuestion("vomiting", "¿Tienes vómitos asociados?"),
      booleanQuestion("blood_in_stool", "¿Has visto sangre en deposiciones?"),
      booleanQuestion("progressive_pain", "¿El dolor abdominal es progresivo?"),
      booleanQuestion("weight_loss", "¿Has tenido baja de peso no explicada?"),
      booleanQuestion("prior_colon_disease", "¿Tienes antecedente digestivo relevante?"),
    ],
    redFlags: [
      {
        id: "rf_constipation_obstruction",
        label: "Sospecha de obstrucción",
        triggerType: "any_yes",
        questionIds: ["no_gas_or_stool", "vomiting", "progressive_pain"],
        severity: "urgent",
        message: "Este patrón puede sugerir obstrucción y requiere evaluación presencial.",
      },
      {
        id: "rf_constipation_alarm_features",
        label: "Características de alarma",
        triggerType: "any_yes",
        questionIds: ["blood_in_stool", "weight_loss"],
        severity: "urgent",
        message: "Sangrado o baja de peso asociada son señales de alarma.",
      },
    ],
    examRules: [
      {
        id: "rule_constipation_uncomplicated",
        description: "Constipación funcional sin alarmas.",
        whenAll: ["mild_constipation"],
        unlessAny: ["no_gas_or_stool", "vomiting", "blood_in_stool", "progressive_pain", "weight_loss"],
        suggestedExams: ["no_routine_exams"],
        rationale: "No se recomiendan exámenes de rutina en constipación leve sin alarmas.",
        requiresMedicalReview: false,
      },
      {
        id: "rule_constipation_review_only",
        description: "Constipación persistente o con antecedentes relevantes.",
        whenAny: ["duration", "prior_colon_disease", "weight_loss"],
        unlessAny: ["no_gas_or_stool", "vomiting", "blood_in_stool", "progressive_pain"],
        suggestedExams: ["no_routine_exams"],
        rationale: "En esta fase V1 se prioriza revisión médica antes de exámenes automáticos.",
        requiresMedicalReview: true,
      },
    ],
    hardStopAction: hardStopAction(
      "urgent",
      "Constipación con signos de alarma",
      "Este cuadro necesita evaluación médica presencial y no debe seguir un flujo digital automático.",
    ),
    nextStep: "clinician_review_before_exams",
  },
  {
    flowId: "dyspepsia_reflux",
    label: "Dispepsia / reflujo",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto tienes estos síntomas digestivos altos?"),
      booleanQuestion("heartburn", "¿Predomina ardor retroesternal o reflujo?"),
      booleanQuestion("epigastric_pain", "¿Predomina dolor o molestia epigástrica?"),
      booleanQuestion("dysphagia", "¿Tienes dificultad para tragar?"),
      booleanQuestion("persistent_vomiting", "¿Tienes vómitos persistentes?"),
      booleanQuestion("gi_bleeding", "¿Hay sangre en vómito o deposiciones negras?"),
      booleanQuestion("weight_loss", "¿Has bajado de peso sin explicación?"),
      booleanQuestion("age_over_60_new_symptoms", "¿Tienes más de 60 años con síntomas de inicio reciente?"),
    ],
    redFlags: [
      {
        id: "rf_dyspepsia_alarm",
        label: "Síntomas de alarma digestiva alta",
        triggerType: "any_yes",
        questionIds: ["dysphagia", "persistent_vomiting", "gi_bleeding", "weight_loss", "age_over_60_new_symptoms"],
        severity: "urgent",
        message: "Los síntomas de alarma digestiva requieren evaluación presencial prioritaria.",
      },
    ],
    examRules: [
      {
        id: "rule_dyspepsia_typical_reflux",
        description: "Síntomas típicos de reflujo/dispepsia sin alarmas.",
        whenAny: ["heartburn"],
        unlessAny: ["dysphagia", "persistent_vomiting", "gi_bleeding", "weight_loss", "age_over_60_new_symptoms"],
        suggestedExams: ["no_routine_exams"],
        rationale: "No se recomiendan paneles generales de rutina en dispepsia no complicada.",
        requiresMedicalReview: false,
      },
      {
        id: "rule_dyspepsia_h_pylori",
        description: "Dispepsia persistente compatible para test no invasivo.",
        whenAll: ["epigastric_pain", "duration"],
        unlessAny: ["dysphagia", "persistent_vomiting", "gi_bleeding", "weight_loss", "age_over_60_new_symptoms"],
        suggestedExams: ["h_pylori_stool_antigen"],
        rationale: "En dispepsia persistente seleccionada, H. pylori en deposiciones es opción inicial.",
        requiresMedicalReview: true,
      },
    ],
    hardStopAction: hardStopAction(
      "urgent",
      "Dispepsia con señales de alarma",
      "Este cuadro debe evaluarse en consulta médica presencial prioritaria.",
    ),
    nextStep: "continue_flow",
  },
  {
    flowId: "dysuria_lower_uti",
    label: "Disuria / síntomas urinarios bajos",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto comenzaron los síntomas urinarios?"),
      booleanQuestion("dysuria", "¿Tienes ardor o dolor al orinar?"),
      booleanQuestion("urinary_frequency", "¿Orinas más seguido de lo habitual?"),
      booleanQuestion("urgency", "¿Sientes urgencia miccional frecuente?"),
      booleanQuestion("fever", "¿Tienes fiebre?"),
      booleanQuestion("flank_pain", "¿Tienes dolor lumbar/flanco?"),
      booleanQuestion("pregnancy_possible", "¿Existe posibilidad de embarazo?"),
      booleanQuestion("urinary_retention", "¿Te cuesta eliminar orina o retienes orina?"),
    ],
    redFlags: [
      {
        id: "rf_uti_upper_or_complicated",
        label: "Posible ITU complicada",
        triggerType: "expression",
        expression: "(fever && flank_pain) || urinary_retention",
        severity: "urgent",
        message: "Fiebre con dolor de flanco o retención urinaria pueden indicar cuadro complicado.",
      },
    ],
    examRules: [
      {
        id: "rule_uti_lower_bundle",
        description: "Síntomas urinarios bajos no complicados.",
        whenAll: ["dysuria"],
        whenAny: ["urinary_frequency", "urgency", "dysuria"],
        unlessAny: ["fever", "flank_pain", "urinary_retention"],
        suggestedExams: ["urinalysis", "urine_culture"],
        rationale: "Bundle base en sospecha de ITU baja ambulatoria.",
        requiresMedicalReview: false,
      },
      {
        id: "rule_uti_add_pregnancy",
        description: "Agregar test de embarazo si aplica.",
        whenAll: ["pregnancy_possible"],
        unlessAny: ["urinary_retention"],
        suggestedExams: ["pregnancy_test"],
        rationale: "El embarazo cambia el marco de evaluación de síntomas urinarios.",
        requiresMedicalReview: false,
      },
    ],
    hardStopAction: hardStopAction(
      "urgent",
      "Síntomas urinarios con señales de alarma",
      "Tu cuadro requiere evaluación presencial urgente antes de una pre-orden ambulatoria.",
    ),
    nextStep: "continue_flow",
  },
  {
    flowId: "hematuria_flank_pain",
    label: "Hematuria / dolor en flanco",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto presentas estos síntomas?"),
      booleanQuestion("visible_hematuria", "¿La orina se ve rojiza o con sangre visible?"),
      booleanQuestion("flank_pain", "¿Tienes dolor en costado lumbar/flanco?"),
      booleanQuestion("fever", "¿Tienes fiebre?"),
      booleanQuestion("anuria", "¿Has dejado de orinar o orinas muy poco?"),
      booleanQuestion("uncontrolled_pain", "¿El dolor es incontrolable?"),
      booleanQuestion("pregnancy_possible", "¿Existe posibilidad de embarazo?"),
      booleanQuestion("dysuria", "¿Tienes ardor al orinar?"),
    ],
    redFlags: [
      {
        id: "rf_hematuria_obstruction_or_sepsis",
        label: "Riesgo de obstrucción séptica/complicación",
        triggerType: "expression",
        expression: "anuria || uncontrolled_pain || (fever && flank_pain) || pregnancy_possible",
        severity: "urgent",
        message: "El patrón clínico requiere evaluación médica urgente presencial.",
      },
    ],
    examRules: [
      {
        id: "rule_hematuria_minimum_urinalysis",
        description: "Urinalysis como estudio mínimo en caso no grave.",
        whenAny: ["visible_hematuria", "flank_pain", "dysuria"],
        unlessAny: ["anuria", "uncontrolled_pain", "pregnancy_possible"],
        suggestedExams: ["urinalysis"],
        rationale: "La hematuria requiere al menos examen de orina en evaluación inicial seleccionada.",
        requiresMedicalReview: true,
      },
      {
        id: "rule_hematuria_add_culture_if_dysuria",
        description: "Agregar urocultivo si hay síntomas urinarios infecciosos.",
        whenAll: ["dysuria"],
        unlessAny: ["anuria", "uncontrolled_pain", "pregnancy_possible"],
        suggestedExams: ["urine_culture"],
        rationale: "Complementa urinalysis cuando hay disuria asociada.",
        requiresMedicalReview: true,
      },
    ],
    hardStopAction: hardStopAction(
      "urgent",
      "Hematuria/flanco con señales de riesgo",
      "Por seguridad, este cuadro no debe seguir en modo ambulatorio automático.",
    ),
    nextStep: "clinician_review_before_exams",
  },
  {
    flowId: "abnormal_uterine_bleeding",
    label: "Sangrado uterino anormal",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto presentas sangrado anormal?"),
      booleanQuestion("heavy_bleeding", "¿El sangrado es abundante (empapa toallas cada hora)?"),
      booleanQuestion("clots_large", "¿El sangrado tiene coágulos grandes?"),
      booleanQuestion("dizziness_weakness", "¿Tienes mareo o debilidad marcada?"),
      booleanQuestion("pregnancy_possible", "¿Existe posibilidad de embarazo?"),
      booleanQuestion("pelvic_pain", "¿Se asocia a dolor pélvico importante?"),
      booleanQuestion("postpartum_recent", "¿Estás en puerperio reciente?"),
      booleanQuestion("bleeding_over_7days", "¿El sangrado dura más de 7 días?"),
    ],
    redFlags: [
      {
        id: "rf_aub_hemodynamic",
        label: "Sangrado con posible compromiso hemodinámico",
        triggerType: "any_yes",
        questionIds: ["heavy_bleeding", "dizziness_weakness"],
        severity: "urgent",
        message: "El sangrado abundante con síntomas de compromiso requiere evaluación urgente.",
      },
      {
        id: "rf_aub_pregnancy_related",
        label: "Sangrado en contexto de posible embarazo",
        triggerType: "any_yes",
        questionIds: ["pregnancy_possible", "postpartum_recent"],
        severity: "urgent",
        message: "Sangrado con posible embarazo/puerperio requiere evaluación prioritaria.",
      },
    ],
    examRules: [
      {
        id: "rule_aub_base",
        description: "Estudio inicial en sangrado uterino no inestable.",
        whenAny: ["bleeding_over_7days", "pelvic_pain", "clots_large", "duration"],
        unlessAny: ["heavy_bleeding", "dizziness_weakness"],
        suggestedExams: ["cbc", "pregnancy_test"],
        rationale: "Hemograma y test de embarazo son base inicial en evaluación ambulatoria seleccionada.",
        requiresMedicalReview: true,
      },
    ],
    hardStopAction: hardStopAction(
      "urgent",
      "Sangrado ginecológico con alarma",
      "Tus respuestas requieren evaluación médica presencial inmediata.",
    ),
    nextStep: "clinician_review_before_exams",
  },
  {
    flowId: "amenorrhea_menstrual_delay",
    label: "Amenorrea / retraso menstrual",
    keyQuestions: [
      durationQuestion("duration", "¿Cuánto tiempo de retraso menstrual tienes?"),
      booleanQuestion("menstrual_delay", "¿Presentas retraso menstrual o ausencia de regla?"),
      booleanQuestion("pregnancy_possible", "¿Existe posibilidad de embarazo?"),
      booleanQuestion("pelvic_pain", "¿Tienes dolor pélvico importante?"),
      booleanQuestion("vaginal_bleeding", "¿Tienes sangrado vaginal anormal?"),
      booleanQuestion("nausea_breast_tenderness", "¿Has tenido náuseas o sensibilidad mamaria?"),
      booleanQuestion("delay_over_3months", "¿El retraso supera 3 meses?"),
    ],
    redFlags: [
      {
        id: "rf_amenorrhea_ectopic_pattern",
        label: "Sospecha de embarazo ectópico/complicado",
        triggerType: "expression",
        expression: "pregnancy_possible && (pelvic_pain || vaginal_bleeding)",
        severity: "urgent",
        message: "Dolor/sangrado con posible embarazo requiere evaluación urgente.",
      },
    ],
    examRules: [
      {
        id: "rule_amenorrhea_always_pregnancy_test",
        description: "Primer paso diagnóstico: test de embarazo.",
        whenAll: ["menstrual_delay"],
        suggestedExams: ["pregnancy_test"],
        rationale: "En amenorrea/retraso, siempre priorizar hCG como primer examen.",
        requiresMedicalReview: false,
      },
      {
        id: "rule_amenorrhea_negative_follow_up_review",
        description: "Si persiste amenorrea con test negativo, pasar a revisión clínica.",
        whenAll: ["delay_over_3months"],
        suggestedExams: ["no_routine_exams"],
        rationale: "La extensión de estudio hormonal debe definirse por médico tratante.",
        requiresMedicalReview: true,
      },
    ],
    hardStopAction: hardStopAction(
      "urgent",
      "Amenorrea con señales de alerta",
      "Por seguridad, este cuadro necesita evaluación médica presencial prioritaria.",
    ),
    nextStep: "clinician_review_before_exams",
  },
  {
    flowId: "vaginal_discharge_pelvic_pain",
    label: "Flujo vaginal / dolor pélvico",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto presentas estos síntomas?"),
      booleanQuestion("abnormal_discharge", "¿Tienes flujo vaginal anormal?"),
      booleanQuestion("pelvic_pain", "¿Tienes dolor pélvico?"),
      booleanQuestion("severe_pelvic_pain", "¿El dolor pélvico es intenso?"),
      booleanQuestion("fever", "¿Tienes fiebre?"),
      booleanQuestion("pregnancy_possible", "¿Existe posibilidad de embarazo?"),
      booleanQuestion("new_partner_or_sti_risk", "¿Hubo nueva pareja o riesgo de ITS reciente?"),
      booleanQuestion("dyspareunia", "¿Presentas dolor con relaciones sexuales?"),
    ],
    redFlags: [
      {
        id: "rf_pid_or_ectopic",
        label: "Sospecha de EIP/embarazo ectópico",
        triggerType: "expression",
        expression: "(fever && pelvic_pain) || (pregnancy_possible && pelvic_pain) || severe_pelvic_pain",
        severity: "urgent",
        message: "Dolor pélvico importante con fiebre o embarazo posible requiere evaluación urgente.",
      },
    ],
    examRules: [
      {
        id: "rule_vaginal_discharge_naat",
        description: "Flujo vaginal sin alarmas mayores.",
        whenAll: ["abnormal_discharge"],
        unlessAny: ["severe_pelvic_pain", "fever"],
        suggestedExams: ["vaginal_naat"],
        rationale: "Estudio microbiológico dirigido en flujo vaginal no complicado.",
        requiresMedicalReview: true,
      },
      {
        id: "rule_vaginal_discharge_add_sti",
        description: "Agregar panel ITS según riesgo clínico.",
        whenAny: ["new_partner_or_sti_risk", "dyspareunia"],
        unlessAny: ["severe_pelvic_pain", "fever"],
        suggestedExams: ["sti_naat"],
        rationale: "Riesgo de ITS amerita ampliación dirigida.",
        requiresMedicalReview: true,
      },
      {
        id: "rule_vaginal_discharge_add_pregnancy",
        description: "Descartar embarazo si corresponde.",
        whenAll: ["pregnancy_possible"],
        suggestedExams: ["pregnancy_test"],
        rationale: "El embarazo cambia conducta y priorización clínica.",
        requiresMedicalReview: true,
      },
    ],
    hardStopAction: hardStopAction(
      "urgent",
      "Flujo/dolor pélvico con señales de alarma",
      "Tus respuestas requieren evaluación clínica presencial urgente.",
    ),
    nextStep: "clinician_review_before_exams",
  },
  {
    flowId: "breast_symptoms",
    label: "Síntomas mamarios",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto notaste el síntoma mamario?"),
      booleanQuestion("palpable_mass", "¿Notas un bulto mamario nuevo?"),
      booleanQuestion("unilateral_nipple_discharge", "¿Hay secreción por pezón unilateral?"),
      booleanQuestion("skin_retraction_or_peau", "¿Hay retracción, piel de naranja o cambio cutáneo llamativo?"),
      booleanQuestion("localized_redness_fever", "¿Hay enrojecimiento con fiebre?"),
      booleanQuestion("cyclic_pain_only", "¿Es solo dolor cíclico sin otros hallazgos?"),
    ],
    redFlags: [
      {
        id: "rf_breast_fast_track",
        label: "Signos mamarios de derivación prioritaria",
        triggerType: "any_yes",
        questionIds: ["palpable_mass", "unilateral_nipple_discharge", "skin_retraction_or_peau"],
        severity: "urgent",
        message: "Estos hallazgos deben evaluarse con prioridad por profesional de salud.",
      },
    ],
    examRules: [
      {
        id: "rule_breast_review_only",
        description: "No auto-sugerir estudios desde flujo general.",
        suggestedExams: ["no_routine_exams"],
        rationale: "El estudio mamario se define por revisión clínica dirigida.",
        requiresMedicalReview: true,
      },
    ],
    hardStopAction: hardStopAction(
      "urgent",
      "Síntomas mamarios que requieren evaluación dirigida",
      "Este flujo debe pasar por revisión clínica antes de sugerir exámenes específicos.",
      "require_clinician_review",
    ),
    nextStep: "clinician_review_before_exams",
  },
  {
    flowId: "scrotal_pain_swelling",
    label: "Dolor / aumento de volumen escrotal",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto comenzó el dolor o aumento de volumen?"),
      booleanQuestion("sudden_severe_onset", "¿Comenzó de forma súbita e intensa?"),
      booleanQuestion("nausea_vomiting", "¿Se acompaña de náuseas o vómitos?"),
      booleanQuestion("fever", "¿Tienes fiebre?"),
      booleanQuestion("urinary_symptoms", "¿Tienes ardor urinario u otros síntomas urinarios?"),
      booleanQuestion("recent_trauma", "¿Hubo traumatismo local?"),
      booleanQuestion("progressive_swelling", "¿Ha aumentado rápidamente el volumen?"),
    ],
    redFlags: [
      {
        id: "rf_scrotal_torsion_pattern",
        label: "Sospecha de torsión testicular",
        triggerType: "expression",
        expression: "sudden_severe_onset || (sudden_severe_onset && nausea_vomiting)",
        severity: "emergency",
        message: "Dolor escrotal súbito intenso puede corresponder a torsión testicular.",
      },
    ],
    examRules: [
      {
        id: "rule_scrotal_review_only",
        description: "No auto-sugerir exámenes ambulatorios en dolor escrotal agudo.",
        suggestedExams: ["no_routine_exams"],
        rationale: "Requiere evaluación clínica presencial prioritaria.",
        requiresMedicalReview: true,
      },
    ],
    hardStopAction: hardStopAction(
      "emergency",
      "Dolor escrotal de posible emergencia",
      "Este cuadro puede requerir resolución urgente inmediata.",
      "redirect_to_urgent_guidance",
    ),
    nextStep: "clinician_review_before_exams",
  },
  {
    flowId: "rash_urticaria_pruritus",
    label: "Rash / urticaria / prurito",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto comenzó el rash/prurito?"),
      booleanQuestion("localized_mild", "¿Es una lesión localizada y leve?"),
      booleanQuestion("rash_spreading_fast", "¿Se está extendiendo rápidamente?"),
      booleanQuestion("angioedema", "¿Tienes hinchazón de labios, lengua o cara?"),
      booleanQuestion("shortness_of_breath", "¿Tienes dificultad para respirar?"),
      booleanQuestion("purpuric_non_blanching", "¿Hay lesiones moradas que no desaparecen al presionar?"),
      booleanQuestion("mucosal_involvement", "¿Hay compromiso de boca, ojos o genitales?"),
      booleanQuestion("high_fever", "¿Tienes fiebre alta con mal estado general?"),
    ],
    redFlags: [
      {
        id: "rf_rash_anaphylaxis",
        label: "Riesgo anafiláctico",
        triggerType: "any_yes",
        questionIds: ["angioedema", "shortness_of_breath"],
        severity: "emergency",
        message: "Compromiso respiratorio o angioedema requieren atención inmediata.",
      },
      {
        id: "rf_rash_severe_cutaneous",
        label: "Rash grave",
        triggerType: "any_yes",
        questionIds: ["purpuric_non_blanching", "mucosal_involvement", "high_fever"],
        severity: "urgent",
        message: "Este patrón cutáneo requiere evaluación médica urgente.",
      },
    ],
    examRules: [
      {
        id: "rule_rash_mild_localized",
        description: "Rash/prurito leve y localizado.",
        whenAll: ["localized_mild"],
        unlessAny: [
          "rash_spreading_fast",
          "angioedema",
          "shortness_of_breath",
          "purpuric_non_blanching",
          "mucosal_involvement",
          "high_fever",
        ],
        suggestedExams: ["no_routine_exams"],
        rationale: "No se recomiendan exámenes de rutina en rash leve localizado.",
        requiresMedicalReview: false,
      },
    ],
    hardStopAction: hardStopAction(
      "emergency",
      "Rash con señales de alerta",
      "Tus respuestas sugieren un cuadro cutáneo que no debe seguir por flujo ambulatorio automático.",
    ),
    nextStep: "continue_flow",
  },
  {
    flowId: "joint_pain_swollen_joint",
    label: "Dolor articular / articulación hinchada",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto tienes dolor articular?"),
      booleanQuestion("swollen_joint", "¿Hay articulación hinchada objetivable?"),
      booleanQuestion("monoarticular", "¿Es solo una articulación afectada?"),
      booleanQuestion("fever", "¿Tienes fiebre?"),
      booleanQuestion("inability_bear_weight", "¿No puedes apoyar o usar la articulación?"),
      booleanQuestion("morning_stiffness_over_30m", "¿Rigidez matinal >30 minutos?"),
      booleanQuestion("symmetric_small_joints", "¿Afecta articulaciones pequeñas de forma simétrica?"),
      booleanQuestion("persistent_over_6weeks", "¿Los síntomas persisten por más de 6 semanas?"),
    ],
    redFlags: [
      {
        id: "rf_joint_septic_pattern",
        label: "Sospecha de artritis séptica",
        triggerType: "expression",
        expression: "swollen_joint && monoarticular && fever",
        severity: "urgent",
        message: "Monoartritis caliente con fiebre puede ser una urgencia infecciosa.",
      },
      {
        id: "rf_joint_function_loss",
        label: "Compromiso funcional severo",
        triggerType: "any_yes",
        questionIds: ["inability_bear_weight"],
        severity: "urgent",
        message: "La incapacidad para apoyar requiere evaluación presencial prioritaria.",
      },
    ],
    examRules: [
      {
        id: "rule_joint_inflammatory_panel",
        description: "Patrón inflamatorio persistente sin red flags mayores.",
        whenAny: ["morning_stiffness_over_30m", "symmetric_small_joints", "persistent_over_6weeks"],
        unlessAny: ["swollen_joint", "monoarticular", "fever", "inability_bear_weight"],
        suggestedExams: ["esr", "crp", "rf", "anti_ccp"],
        rationale: "Panel inicial conservador para orientar artritis inflamatoria crónica.",
        requiresMedicalReview: true,
      },
      {
        id: "rule_joint_non_inflammatory",
        description: "Dolor articular sin patrón inflamatorio claro.",
        unlessAny: ["swollen_joint", "monoarticular", "fever", "inability_bear_weight"],
        suggestedExams: ["no_routine_exams"],
        rationale: "Evitar sobre-indicación en cuadros mecánicos leves.",
        requiresMedicalReview: false,
      },
    ],
    hardStopAction: hardStopAction(
      "urgent",
      "Dolor articular con señales de alarma",
      "Tus respuestas requieren evaluación médica presencial pronta.",
    ),
    nextStep: "continue_flow",
  },
  {
    flowId: "low_back_pain_sciatica",
    label: "Lumbago / ciática",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto tienes dolor lumbar?"),
      booleanQuestion("pain_radiates_leg", "¿El dolor baja por la pierna?"),
      booleanQuestion("urinary_retention", "¿Has tenido retención urinaria o incontinencia nueva?"),
      booleanQuestion("saddle_anesthesia", "¿Tienes adormecimiento en zona genital/perineal?"),
      booleanQuestion("progressive_weakness", "¿Notas debilidad progresiva en piernas?"),
      booleanQuestion("fever", "¿Tienes fiebre asociada?"),
      booleanQuestion("cancer_history", "¿Tienes antecedente de cáncer?"),
      booleanQuestion("recent_trauma", "¿Hubo traumatismo reciente?"),
      booleanQuestion("persistent_over_6weeks", "¿Lleva más de 6 semanas?"),
    ],
    redFlags: [
      {
        id: "rf_back_caud_equina",
        label: "Síndrome de cauda equina",
        triggerType: "any_yes",
        questionIds: ["urinary_retention", "saddle_anesthesia", "progressive_weakness"],
        severity: "emergency",
        message: "Retención urinaria, anestesia en silla de montar o debilidad progresiva son señales de emergencia.",
      },
      {
        id: "rf_back_other_alarm",
        label: "Otras alarmas mayores",
        triggerType: "any_yes",
        questionIds: ["fever", "cancer_history", "recent_trauma"],
        severity: "urgent",
        message: "Fiebre, antecedente oncológico o trauma requieren evaluación presencial.",
      },
    ],
    examRules: [
      {
        id: "rule_back_uncomplicated",
        description: "Lumbago/ciática sin red flags.",
        whenAny: ["pain_radiates_leg"],
        unlessAny: [
          "urinary_retention",
          "saddle_anesthesia",
          "progressive_weakness",
          "fever",
          "cancer_history",
          "recent_trauma",
        ],
        suggestedExams: ["no_routine_exams"],
        rationale: "Sin alarmas, no se recomiendan imágenes ni laboratorios de rutina inicial.",
        requiresMedicalReview: false,
      },
      {
        id: "rule_back_persistent_review",
        description: "Dolor lumbar persistente requiere revisión médica.",
        whenAll: ["persistent_over_6weeks"],
        unlessAny: [
          "urinary_retention",
          "saddle_anesthesia",
          "progressive_weakness",
          "fever",
          "cancer_history",
          "recent_trauma",
        ],
        suggestedExams: ["no_routine_exams"],
        rationale: "La indicación de imágenes/estudios debe individualizarse con evaluación clínica.",
        requiresMedicalReview: true,
      },
    ],
    hardStopAction: hardStopAction(
      "emergency",
      "Lumbago con signos de alarma",
      "Tus respuestas muestran señales que requieren evaluación urgente presencial.",
    ),
    nextStep: "continue_flow",
  },
  {
    flowId: "anxiety_panic_insomnia_low_mood",
    label: "Ansiedad / pánico / insomnio / ánimo bajo",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto presentas estos síntomas?"),
      booleanQuestion("panic_episodes", "¿Has tenido crisis de pánico?"),
      booleanQuestion("insomnia", "¿Tienes insomnio relevante?"),
      booleanQuestion("low_mood", "¿Te sientes con ánimo bajo la mayor parte del tiempo?"),
      booleanQuestion("suicidal_ideation", "¿Has tenido ideas de hacerte daño o suicidarte?"),
      booleanQuestion("psychosis_symptoms", "¿Has tenido alucinaciones o ideas delirantes?"),
      booleanQuestion("severe_agitation", "¿Tienes agitación extrema o pérdida de control?"),
      booleanQuestion("unable_self_care", "¿Te cuesta mantener autocuidado básico?"),
    ],
    redFlags: [
      {
        id: "rf_mental_health_emergency",
        label: "Riesgo psiquiátrico agudo",
        triggerType: "any_yes",
        questionIds: ["suicidal_ideation", "psychosis_symptoms", "severe_agitation", "unable_self_care"],
        severity: "emergency",
        message: "Este patrón requiere ayuda clínica urgente e inmediata.",
      },
    ],
    examRules: [
      {
        id: "rule_mental_health_no_routine_labs",
        description: "No usar exámenes de rutina como puerta de entrada por defecto.",
        suggestedExams: ["no_routine_exams"],
        rationale: "En V1 se prioriza evaluación clínica y escalas antes de laboratorio indiscriminado.",
        requiresMedicalReview: false,
      },
    ],
    hardStopAction: hardStopAction(
      "emergency",
      "Señales de riesgo en salud mental",
      "Por seguridad, se debe activar orientación de urgencia y soporte inmediato.",
      "redirect_to_urgent_guidance",
    ),
    nextStep: "continue_flow",
  },
  {
    flowId: "fatigue_weight_loss_general_symptoms",
    label: "Fatiga / baja de peso / síntomas generales",
    keyQuestions: [
      durationQuestion("duration", "¿Hace cuánto tienes estos síntomas generales?"),
      booleanQuestion("persistent_fatigue", "¿La fatiga es persistente y limita tu rutina?"),
      booleanQuestion("unintentional_weight_loss", "¿Has bajado de peso sin proponértelo?"),
      booleanQuestion("persistent_fever", "¿Tienes fiebre persistente?"),
      booleanQuestion("bleeding_symptoms", "¿Tienes sangrados anormales?"),
      booleanQuestion("generalized_lymph_nodes", "¿Notas ganglios aumentados en varias zonas?"),
      booleanQuestion("severe_anemia_symptoms", "¿Tienes palidez marcada, disnea o taquicardia en reposo?"),
      booleanQuestion("poor_sleep_stress", "¿El cansancio se asocia principalmente a estrés/sueño no reparador?"),
      booleanQuestion("polyuria_polydipsia", "¿Tienes mucha sed y aumento de orina?"),
    ],
    redFlags: [
      {
        id: "rf_fatigue_alarm",
        label: "Síntomas generales de alarma",
        triggerType: "any_yes",
        questionIds: [
          "unintentional_weight_loss",
          "persistent_fever",
          "bleeding_symptoms",
          "generalized_lymph_nodes",
          "severe_anemia_symptoms",
        ],
        severity: "urgent",
        message: "Este patrón clínico requiere evaluación médica presencial prioritaria.",
      },
    ],
    examRules: [
      {
        id: "rule_fatigue_functional_pattern",
        description: "Patrón funcional probable sin señales de alarma.",
        whenAll: ["poor_sleep_stress"],
        unlessAny: [
          "unintentional_weight_loss",
          "persistent_fever",
          "bleeding_symptoms",
          "generalized_lymph_nodes",
          "severe_anemia_symptoms",
        ],
        suggestedExams: ["no_routine_exams"],
        rationale: "Evitar paneles amplios automáticos cuando predomina componente funcional.",
        requiresMedicalReview: false,
      },
      {
        id: "rule_fatigue_selected_basic_bundle",
        description: "Bundle básico en contextos seleccionados no urgentes.",
        whenAny: ["persistent_fatigue", "polyuria_polydipsia", "duration"],
        unlessAny: [
          "unintentional_weight_loss",
          "persistent_fever",
          "bleeding_symptoms",
          "generalized_lymph_nodes",
          "severe_anemia_symptoms",
        ],
        suggestedExams: ["cbc", "glucose", "creatinine", "electrolytes"],
        rationale: "Bundle mínimo y conservador para orientar evaluación inicial.",
        requiresMedicalReview: true,
      },
    ],
    hardStopAction: hardStopAction(
      "urgent",
      "Síntomas generales con alarma",
      "Tus respuestas sugieren necesidad de evaluación presencial prioritaria.",
    ),
    nextStep: "clinician_review_before_exams",
  },
];

const REQUIRED_FLOW_IDS = [
  "sore_throat",
  "acute_cough",
  "dyspnea",
  "chest_pain",
  "palpitations",
  "headache",
  "dizziness_vertigo",
  "syncope_presyncope",
  "acute_abdominal_pain",
  "nausea_vomiting",
  "diarrhea",
  "constipation",
  "dyspepsia_reflux",
  "dysuria_lower_uti",
  "hematuria_flank_pain",
  "abnormal_uterine_bleeding",
  "amenorrhea_menstrual_delay",
  "vaginal_discharge_pelvic_pain",
  "breast_symptoms",
  "scrotal_pain_swelling",
  "rash_urticaria_pruritus",
  "joint_pain_swollen_joint",
  "low_back_pain_sciatica",
  "anxiety_panic_insomnia_low_mood",
  "fatigue_weight_loss_general_symptoms",
] as const;

function validateFlowDefinition(flow: ClinicalFlowDefinition) {
  const parsed = clinicalFlowDefinitionSchema.parse(flow);
  const questionIdSet = new Set(parsed.keyQuestions.map((question) => question.id));

  for (const redFlag of parsed.redFlags) {
    for (const questionId of redFlag.questionIds ?? []) {
      if (!questionIdSet.has(questionId)) {
        throw new Error(`Flow ${flow.flowId}: redFlag ${redFlag.id} usa questionId inexistente: ${questionId}`);
      }
    }
  }

  for (const rule of parsed.examRules) {
    for (const questionId of [...(rule.whenAll ?? []), ...(rule.whenAny ?? []), ...(rule.unlessAny ?? [])]) {
      if (!questionIdSet.has(questionId)) {
        throw new Error(`Flow ${flow.flowId}: examRule ${rule.id} usa questionId inexistente: ${questionId}`);
      }
    }

    for (const examId of rule.suggestedExams) {
      if (!EXAM_CATALOG_IDS.has(examId)) {
        throw new Error(`Flow ${flow.flowId}: examRule ${rule.id} referencia examen inexistente: ${examId}`);
      }
    }
  }

  return parsed;
}

function validateFlowSet(flows: ClinicalFlowDefinition[]) {
  const validated = flows.map(validateFlowDefinition);
  const foundIds = new Set(validated.map((flow) => flow.flowId));
  const duplicates = validated
    .map((flow) => flow.flowId)
    .filter((flowId, index, source) => source.indexOf(flowId) !== index);

  if (duplicates.length > 0) {
    throw new Error(`Flows duplicados: ${duplicates.join(", ")}`);
  }

  for (const requiredId of REQUIRED_FLOW_IDS) {
    if (!foundIds.has(requiredId)) {
      throw new Error(`Falta flow clínico requerido: ${requiredId}`);
    }
  }

  if (validated.length !== REQUIRED_FLOW_IDS.length) {
    throw new Error(
      `Cantidad de flows inválida. Esperados=${REQUIRED_FLOW_IDS.length} | actuales=${validated.length}`,
    );
  }

  return validated;
}

export const CLINICAL_FLOWS = validateFlowSet(FLOWS_RAW);
export const CLINICAL_FLOW_MAP = new Map(CLINICAL_FLOWS.map((flow) => [flow.flowId, flow]));
