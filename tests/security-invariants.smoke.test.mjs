import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("PDFs nuevos usan el Blob Store privado", () => {
  for (const path of [
    "lib/server/order-pdf-assets.ts",
    "lib/server/symptoms-order-pdf-assets.ts",
  ]) {
    const source = read(path);
    assert.match(source, /access: "private"/);
    assert.match(source, /PRIVATE_BLOB_READ_WRITE_TOKEN/);
    assert.doesNotMatch(source, /access: "public"/);
  }
});

test("la firma médica ya no está publicada como activo estático", () => {
  assert.equal(
    existsSync(new URL("../public/firmas/firma-VRM.png", import.meta.url)),
    false,
  );
  const signatureRoute = read("app/api/orders/signature/route.ts");
  assert.match(signatureRoute, /authorizeOrderRequest/);
  assert.match(signatureRoute, /getApprovedMedicalSigner/);
});

test("los enlaces PDF están limitados a siete días y son revocables", () => {
  const source = read("lib/server/order-pdf-access.ts");
  assert.match(source, /7 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(source, /revokePdfAccessLinks/);
  assert.match(source, /orderPdfAccessLog\.create/);
});

test("el correo de órdenes es verificable, reintentable e idempotente", () => {
  const orderPage = read("app/chequeo/orden/page.tsx");
  const emailRoute = read("app/api/send-email/route.ts");
  const emailService = read("lib/server/order-ready-email.ts");
  const checkupStore = read("lib/server/checkup-store.ts");

  assert.match(orderPage, /emailDeliveryStatus/);
  assert.match(orderPage, /Reintentar envío/);
  assert.match(orderPage, /sendOrderReadyEmail/);
  assert.match(emailRoute, /hasValidRequestAccessCookie/);
  assert.match(emailRoute, /maxDuration = 300/);
  assert.match(emailService, /idempotencyKey: `order-ready-checkup-/);
  assert.doesNotMatch(checkupStore, /void processOrderOutbox/);
});

test("la vista de impresión y el PDF final fuerzan carta vertical", () => {
  const orderPage = read("app/chequeo/orden/page.tsx");
  const renderer = read("lib/server/order-pdf-browser.ts");

  assert.match(orderPage, /cssSize: "letter portrait"/);
  assert.match(orderPage, /size: \$\{LETTER_PRINT_CONFIG\.cssSize\}/);
  assert.match(renderer, /preferCSSPageSize: true/);
});

test("las páginas cliente no importan definiciones privadas de descuento", () => {
  for (const path of [
    "app/chequeo/pago/page.tsx",
    "app/control-cronico/pago/page.tsx",
    "app/sintomas/pago/page.tsx",
  ]) {
    const source = read(path);
    assert.doesNotMatch(source, /server\/discount-codes/);
    assert.match(source, /validateDiscountCode/);
  }
});

test("el monitor de campañas es administrativo y cuenta sólo pagos confirmados", () => {
  const campaignRoute = read("app/api/portal-medicos/discounts/route.ts");
  const campaignChange = read("app/api/portal-medicos/discounts/[id]/route.ts");
  const discountService = read("lib/server/discount-codes.ts");
  const standardPayment = read("lib/server/transbank/service.ts");
  const symptomsPayment = read("app/api/sintomas/payments/create/route.ts");
  assert.match(campaignRoute, /canManageMedicalUsers/);
  assert.match(campaignRoute, /status: "paid"/);
  assert.match(campaignRoute, /encryptDiscountCode/);
  assert.match(campaignChange, /requireSameOrigin/);
  assert.match(discountService, /aes-256-gcm/);
  assert.match(standardPayment, /discountCodeId: appliedDiscount\?\.id/);
  assert.match(symptomsPayment, /discountCodeId: appliedDiscount\?\.id/);
});

test("archivar boletas sólo las quita del panel y permite restaurarlas", () => {
  const route = read("app/api/portal-medicos/receipts/archive/route.ts");
  const service = read("lib/server/electronic-receipts.ts");
  const client = read("app/portal-medicos/boletas/ReceiptManagementClient.tsx");
  assert.match(route, /canManageMedicalUsers/);
  assert.match(route, /requireSameOrigin/);
  assert.match(service, /archivedAt: new Date\(\)/);
  assert.match(service, /archivedAt: null/);
  assert.doesNotMatch(route, /\.delete\(|\bdel\(/);
  assert.match(client, /Registro compacto/);
  assert.match(client, /Restaurar/);
});

test("las sesiones se guardan como hash y el portal médico usa sesiones revocables", () => {
  const patientAuth = read("lib/server/auth-store.ts");
  const medicalAuth = read("lib/server/medical-portal-auth.ts");
  assert.match(patientAuth, /hashOpaqueToken\(rawToken\)/);
  assert.match(medicalAuth, /medicalPortalSession\.create/);
  assert.match(medicalAuth, /revokeMedicalPortalSession/);
  assert.doesNotMatch(medicalAuth, /test123/);
  assert.doesNotMatch(medicalAuth, /veramed-medicos-dev-secret/);
});

test("la recuperación médica usa tokens aislados, temporales y revoca sesiones", () => {
  const loginPage = read("app/medicos-login/page.tsx");
  const forgotRoute = read("app/api/medicos-auth/password/forgot/route.ts");
  const resetRoute = read("app/api/medicos-auth/password/reset/route.ts");
  const tokenService = read("lib/server/password-reset.ts");

  assert.doesNotMatch(loginPage, /Código de autenticación/);
  assert.match(loginPage, /\/medicos-login\/recuperar-contrasena/);
  assert.match(forgotRoute, /purpose: "medical"/);
  assert.match(forgotRoute, /GENERIC_RESPONSE/);
  assert.match(forgotRoute, /enforceRateLimit/);
  assert.match(resetRoute, /"medical"/);
  assert.match(resetRoute, /medicalPortalSession\.updateMany/);
  assert.match(resetRoute, /medical\.password_recovered/);
  assert.match(tokenService, /Date\.now\(\) \+ RESET_TTL_MS/);
  assert.match(tokenService, /expectedPurpose/);
});

test("las lecturas de órdenes no aprueban ni envían correos", () => {
  for (const path of [
    "lib/server/checkup-store.ts",
    "lib/server/chronic-control-store.ts",
  ]) {
    const source = read(path);
    const getter = source.slice(source.indexOf("export async function get"), source.indexOf("export async function create", source.indexOf("export async function get")));
    assert.doesNotMatch(getter, /reviewStatus:\s*"approved"/);
    assert.doesNotMatch(getter, /sendApprovedOrderEmail/);
    assert.match(source, /enqueueOrderApproved/);
  }
});

test("síntomas exige consentimiento y limita los datos enviados a IA", () => {
  const schema = read("lib/server/request-schemas.ts");
  const route = read("app/api/sintomas/interpret/route.ts");
  const client = read("app/sintomas/page.tsx");
  assert.match(schema, /consentToAiProcessing:\s*z\.literal\(true\)/);
  assert.match(schema, /symptomsText:\s*trimmed\(12,\s*4_000\)/);
  assert.match(route, /symptoms:interpret/);
  assert.match(client, /modelo\s+propietario de LLM/);
  assert.match(client, /no reemplaza[\s\S]{0,100}la atención clínica directa/);
  assert.match(client, /checked=\{consentToAiProcessing\}/);
  assert.match(client, /checked=\{acknowledgesMedicalReview\}/);
  assert.match(
    client,
    /consentToAiProcessing:\s*consentToAiProcessing\s*&&\s*acknowledgesMedicalReview/,
  );
});

test("la interpretación de síntomas se persiste en servidor antes del pago", () => {
  const interpretRoute = read("app/api/sintomas/interpret/route.ts");
  const paymentRoute = read("app/api/sintomas/payments/create/route.ts");
  assert.match(interpretRoute, /createOrUpdateSymptomsDraft/);
  assert.match(interpretRoute, /requestId: draft\.id/);
  assert.doesNotMatch(paymentRoute, /data\.draft/);
  assert.match(paymentRoute, /getSymptomsRequest\(data\.orderId\)/);
});

test("síntomas usa 4o-mini antes del pago y Luna sólo en entrevista y exámenes pagados", () => {
  const openai = read("lib/server/symptoms-openai.ts");
  const interviewRoute = read("app/api/sintomas/interview/turn/route.ts");
  const interviewStartRoute = read("app/api/sintomas/interview/start/route.ts");
  const flowPage = read("app/sintomas/flujo/page.tsx");
  const orderRoute = read("app/api/sintomas/orders/build/route.ts");

  assert.match(openai, /const PREPAY_MODEL = "gpt-4o-mini"/);
  assert.match(openai, /const POSTPAY_MODEL = "gpt-5\.6-luna"/);
  assert.match(openai, /interpretSymptomsWithOpenAI[\s\S]*?const model = PREPAY_MODEL/);
  assert.match(openai, /suggestSymptomsExamsWithOpenAI[\s\S]*?const model = POSTPAY_MODEL/);
  assert.match(openai, /continueSymptomsInterviewWithOpenAI[\s\S]*?const model = POSTPAY_MODEL/);
  assert.doesNotMatch(openai, /OPENAI_SYMPTOMS_MODEL/);
  assert.match(interviewRoute, /record\.payment\.status !== "paid"/);
  assert.match(interviewStartRoute, /record\.payment\.status !== "paid"/);
  assert.match(interviewStartRoute, /continueSymptomsInterviewWithOpenAI/);
  assert.match(flowPage, /\/api\/sintomas\/interview\/start/);
  assert.match(orderRoute, /requestRecord\.payment\.status !== "paid"/);
});

test("la entrevista por síntomas es adaptativa y persiste cada turno en servidor", () => {
  const interviewRoute = read("app/api/sintomas/interview/turn/route.ts");
  const flowPage = read("app/sintomas/flujo/page.tsx");
  const orderRoute = read("app/api/sintomas/orders/build/route.ts");
  const openai = read("lib/server/symptoms-openai.ts");

  assert.match(interviewRoute, /continueSymptomsInterviewWithOpenAI/);
  assert.match(interviewRoute, /saveSymptomsInterviewTurn/);
  assert.match(interviewRoute, /findDeterministicUrgency/);
  assert.match(interviewRoute, /symptoms:interview-turn/);
  assert.match(flowPage, /\/api\/sintomas\/interview\/turn/);
  assert.match(flowPage, /quickReplies/);
  assert.doesNotMatch(orderRoute, /parsed\.data\.answers/);
  assert.match(orderRoute, /requestRecord\.followUpAnswers/);
  assert.match(openai, /openai\.responses/);
  assert.match(openai, /store:\s*false/);
});

test("el estado clínico interno no se expone al paciente y sí queda disponible al médico", () => {
  const patientRoute = read("app/api/sintomas/requests/[id]/route.ts");
  const doctorRoute = read("app/api/portal-medicos/symptoms/[id]/route.ts");
  const migration = read(
    "prisma/migrations/20260907153000_adaptive_symptoms_interview_v2/migration.sql",
  );

  assert.match(patientRoute, /internalFields/);
  assert.match(patientRoute, /"clinicalState"/);
  assert.match(patientRoute, /"questionQueue"/);
  assert.match(doctorRoute, /clinicalState: record\.clinicalState/);
  assert.match(doctorRoute, /interviewMetadata: record\.interviewMetadata/);
  assert.match(migration, /"clinicalState" JSONB/);
  assert.doesNotMatch(migration, /NOT NULL/);
});

test("la preorden por síntomas queda identificada visualmente como borrador", () => {
  const orderPage = read("app/sintomas/orden/page.tsx");
  assert.match(orderPage, /Borrador — no válido como orden médica/);
  assert.match(orderPage, /VISTA PREVIA — NO VÁLIDA/);
  assert.match(orderPage, /showSignature=\{isValidated\}/);
});

test("el portal médico permite expandir la historia clínica completa", () => {
  const reviewPage = read("app/portal-medicos/orden/[id]/ReviewSymptomsOrderClient.tsx");
  assert.match(reviewPage, /showClinicalDetails/);
  assert.match(reviewPage, /Relato original/);
  assert.match(reviewPage, /Antecedentes declarados/);
  assert.match(reviewPage, /Entrevista de seguimiento/);
});

test("el portal médico reutiliza el validador y aísla los nuevos borradores clínicos", () => {
  const shell = read("app/portal-medicos/_components/MedicalPortalShell.tsx");
  const validatorPage = read("app/portal-medicos/validar-ordenes/page.tsx");
  const examPage = read("app/portal-medicos/indicaciones/examenes/page.tsx");
  const prescription = read("app/portal-medicos/_components/StandardPrescriptionBuilder.tsx");
  const prescriptionRoute = read("app/api/portal-medicos/prescriptions/route.ts");
  const vaccines = read("app/portal-medicos/_components/VaccineOrderBuilder.tsx");

  assert.match(validatorPage, /PortalMedicosClient/);
  assert.match(shell, /\/portal-medicos\/orden\//);
  assert.match(shell, /target="_blank"/);
  assert.match(shell, /rel="noopener noreferrer"/);
  assert.match(examPage, /EXAM_MASTER_CATALOG/);
  assert.match(prescription, /\/api\/portal-medicos\/prescriptions/);
  assert.match(prescriptionRoute, /canValidateMedicalOrders/);
  assert.match(prescriptionRoute, /recordMedicalAudit/);
  assert.match(vaccines, /VACCINE_CATALOG/);
  assert.doesNotMatch(vaccines, /fetch\(/);
});

test("la administración médica separa roles, protege al administrador principal e invita sin contraseñas", () => {
  const schema = read("prisma/schema.prisma");
  const auth = read("lib/server/medical-portal-auth.ts");
  const usersRoute = read("app/api/medicos-auth/users/route.ts");
  const invitationsRoute = read("app/api/medicos-auth/invitations/route.ts");
  const acceptRoute = read("app/api/medicos-auth/invitations/accept/route.ts");
  const validationRoute = read("app/api/portal-medicos/symptoms/[id]/validate/route.ts");

  assert.match(schema, /enum MedicalPortalRoleDb\s*{\s*portal\s+doctor\s+admin/);
  assert.match(schema, /model MedicalPortalInvitation/);
  assert.match(schema, /tokenHash\s+String\s+@unique/);
  assert.doesNotMatch(schema, /MedicalPortalInvitation[\s\S]{0,500}\bpassword\b/i);
  assert.match(auth, /PRIMARY_MEDICAL_ADMIN_EMAIL/);
  assert.match(auth, /preservePrimaryMedicalAdmin/);
  assert.match(auth, /data:\s*{\s*active:\s*true,\s*role:\s*MedicalPortalRoleDb\.admin\s*}/);
  assert.match(usersRoute, /targetIsPrimary/);
  assert.match(usersRoute, /canViewPatients\s*\?\s*prisma\.user\.findMany/);
  assert.match(invitationsRoute, /medicalInvitationTokenHash\(rawToken\)/);
  assert.match(invitationsRoute, /RESEND_API_KEY/);
  assert.match(invitationsRoute, /idempotencyKey/);
  assert.match(acceptRoute, /password:\s*z\.string\(\)\.min\(12\)/);
  assert.match(acceptRoute, /acceptedAt:\s*now/);
  assert.match(validationRoute, /canValidateMedicalOrders/);
});

test("las rutas críticas cuentan con protección de origen, tamaño y rate limit", () => {
  const security = read("lib/server/http-security.ts");
  assert.match(security, /requireSameOrigin/);
  assert.match(security, /readJsonBody/);
  assert.match(security, /rateLimitBucket\.upsert/);
  for (const path of [
    "app/api/auth/login/route.ts",
    "app/api/payments/transbank/create/route.ts",
    "app/api/sintomas/payments/create/route.ts",
  ]) {
    const source = read(path);
    assert.match(source, /enforceRateLimit/);
    assert.match(source, /requireSameOrigin/);
  }
});

test("el archivo masivo de boletas sólo archiva, conserva documentos y exige autorización administrativa", () => {
  const route = read("app/api/portal-medicos/receipts/archive-all/route.ts");
  const store = read("lib/server/electronic-receipts.ts");
  const panel = read("app/portal-medicos/boletas/ReceiptManagementClient.tsx");
  assert.match(route, /requireSameOrigin\(request\)/);
  assert.match(route, /canManageMedicalUsers\(session\)/);
  assert.match(route, /body\?\.confirm !== true/);
  assert.match(route, /electronic_receipt\.archive_all/);
  assert.match(store, /listReceiptWorkItems\(\{ all: true \}\)/);
  assert.match(store, /electronicReceipt\.createMany/);
  assert.match(store, /electronicReceipt\.updateMany/);
  assert.doesNotMatch(store.slice(store.indexOf("export async function archiveAllReceiptWorkItems"), store.indexOf("export async function", store.indexOf("export async function archiveAllReceiptWorkItems") + 1)), /\.delete(Many)?\(/);
  assert.match(panel, /Archivar todas/);
});

test("el monitor de órdenes automáticas excluye la validación manual y exige pagos confirmados", () => {
  const store = read("lib/server/automatic-orders.ts");
  const route = read("app/api/portal-medicos/automatic-orders/route.ts");
  const page = read("app/portal-medicos/ordenes-automaticas/page.tsx");
  const shell = read("app/portal-medicos/_components/MedicalPortalShell.tsx");
  assert.match(store, /approvalMethod: "automatic_protocol"/);
  assert.match(store, /reviewStatus: "approved"/);
  assert.match(store, /payment: \{ is: \{ status: "paid"/);
  assert.match(store, /prisma\.checkupRequest\.findMany/);
  assert.match(store, /prisma\.chronicControlRequest\.findMany/);
  assert.match(route, /canManageMedicalUsers\(session\)/);
  assert.match(route, /automatic_orders\.list/);
  assert.match(page, /canManageMedicalUsers\(session\)/);
  assert.match(shell, /\/portal-medicos\/ordenes-automaticas/);
});
