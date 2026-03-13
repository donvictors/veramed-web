import { z } from "zod";

export const questionTypeSchema = z.enum([
  "boolean",
  "single_select",
  "multi_select",
  "number",
  "text",
  "duration",
]);

export const questionOptionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const keyQuestionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  type: questionTypeSchema,
  required: z.boolean(),
  options: z.array(questionOptionSchema).optional(),
  helpText: z.string().min(1).optional(),
});

export const redFlagTriggerTypeSchema = z.enum(["any_yes", "all_yes", "expression"]);
export const redFlagSeveritySchema = z.enum(["urgent", "emergency"]);
export const nextStepSchema = z.enum([
  "continue_flow",
  "clinician_review_before_exams",
  "show_urgent_warning",
  "show_emergency_warning",
]);

export const redFlagRuleSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    triggerType: redFlagTriggerTypeSchema,
    questionIds: z.array(z.string().min(1)).optional(),
    expression: z.string().min(1).optional(),
    severity: redFlagSeveritySchema,
    message: z.string().min(1),
  })
  .superRefine((value, context) => {
    if (value.triggerType === "expression" && !value.expression) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "redFlagRule.expression es obligatorio cuando triggerType = expression",
      });
    }

    if ((value.triggerType === "any_yes" || value.triggerType === "all_yes") && !value.questionIds?.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "redFlagRule.questionIds es obligatorio cuando triggerType = any_yes|all_yes",
      });
    }
  });

export const examRuleSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  whenAll: z.array(z.string().min(1)).optional(),
  whenAny: z.array(z.string().min(1)).optional(),
  unlessAny: z.array(z.string().min(1)).optional(),
  suggestedExams: z.array(z.string().min(1)),
  rationale: z.string().min(1).optional(),
  requiresMedicalReview: z.boolean(),
});

export const hardStopActionSchema = z.object({
  enabled: z.boolean(),
  severity: redFlagSeveritySchema,
  title: z.string().min(1),
  message: z.string().min(1),
  action: z.enum([
    "stop_and_show_warning",
    "redirect_to_urgent_guidance",
    "require_clinician_review",
  ]),
});

export const clinicalFlowDefinitionSchema = z
  .object({
    flowId: z.string().min(1),
    label: z.string().min(1),
    keyQuestions: z.array(keyQuestionSchema).min(1),
    redFlags: z.array(redFlagRuleSchema),
    examRules: z.array(examRuleSchema),
    hardStopAction: hardStopActionSchema,
    nextStep: nextStepSchema,
  })
  .superRefine((value, context) => {
    const questionIds = new Set<string>();
    for (const question of value.keyQuestions) {
      if (questionIds.has(question.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Pregunta duplicada en flow ${value.flowId}: ${question.id}`,
        });
      }
      questionIds.add(question.id);
    }

    const redFlagIds = new Set<string>();
    for (const redFlag of value.redFlags) {
      if (redFlagIds.has(redFlag.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Red flag duplicada en flow ${value.flowId}: ${redFlag.id}`,
        });
      }
      redFlagIds.add(redFlag.id);
    }

    const examRuleIds = new Set<string>();
    for (const examRule of value.examRules) {
      if (examRuleIds.has(examRule.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Exam rule duplicada en flow ${value.flowId}: ${examRule.id}`,
        });
      }
      examRuleIds.add(examRule.id);
    }
  });

export const flowAnswersSchema = z.record(z.string(), z.unknown());

export const flowEvaluationResultSchema = z.object({
  flowId: z.string().min(1),
  triggeredRedFlags: z.array(z.string()),
  hardStopTriggered: z.boolean(),
  hardStopSeverity: redFlagSeveritySchema.optional(),
  suggestedExams: z.array(z.string()),
  nextStep: nextStepSchema,
  clinicianReviewRequired: z.boolean(),
  debug: z
    .object({
      matchedExamRuleIds: z.array(z.string()),
      matchedRedFlagIds: z.array(z.string()),
    })
    .optional(),
});

export type QuestionType = z.infer<typeof questionTypeSchema>;
export type KeyQuestion = z.infer<typeof keyQuestionSchema>;
export type RedFlagRule = z.infer<typeof redFlagRuleSchema>;
export type ExamRule = z.infer<typeof examRuleSchema>;
export type HardStopAction = z.infer<typeof hardStopActionSchema>;
export type NextStep = z.infer<typeof nextStepSchema>;
export type ClinicalFlowDefinition = z.infer<typeof clinicalFlowDefinitionSchema>;
export type FlowAnswers = z.infer<typeof flowAnswersSchema>;
export type FlowEvaluationResult = z.infer<typeof flowEvaluationResultSchema>;

