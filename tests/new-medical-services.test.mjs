import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadModule } from "./helpers/load-typescript.mjs";

const kine = loadModule("lib/clinical/kinesiology-eligibility.ts");
const renewal = loadModule("lib/clinical/prescription-renewal-protocol.ts");
const weight = loadModule("lib/clinical/weight-management-protocol.ts");
const baseExtraction = { diagnosis: "Artrosis de rodilla", anatomicalRegion: "rodilla", laterality: "left", documentDate: "2026-08-01", providerName: "Médico", providerInstitution: null, surgeryOrProcedure: null, rehabExplicitlyIndicated: true, redFlagTextFound: [], extractionConfidence: .95 };
const safe = { pregnant:false, breastfeeding:false, planningPregnancy:false, medullaryThyroidCancerOrMen2:false, semaglutideHypersensitivity:false, pancreatitis:false, relevantBiliaryDisease:false, severeGastroparesisSymptoms:false, relevantKidneyDisease:false, usingOtherGlp1OrTirzepatide:false, usingInsulinOrSulfonylurea:false, bariatricSurgery:false };

test("kinesioterapia sin diagnóstico deriva gratis a síntomas en la API",()=>{const source=readFileSync("app/api/new-services/kinesiology/route.ts","utf8");assert.match(source,/redirect: "\/sintomas", priceClp: null/)});
test("documento y diagnóstico elegible permiten $3.990",()=>{assert.equal(kine.evaluateKinesiologyEligibility(baseExtraction),"eligible");assert.equal(kine.KINESIOLOGY_PRICE_CLP,3990)});
test("documento ilegible es documentación insuficiente",()=>assert.equal(kine.evaluateKinesiologyEligibility({...baseExtraction,extractionConfidence:.2}),"insufficient_documentation"));
test("red flag fuerza revisión",()=>assert.equal(kine.evaluateKinesiologyEligibility({...baseExtraction,redFlagTextFound:["déficit neurológico"]}),"manual_review"));
test("servidor recalcula kinesioterapia",()=>assert.match(readFileSync("app/api/new-services/kinesiology/route.ts","utf8"),/evaluateKinesiologyEligibility\(extraction\)/));

const renewalBase={medicationId:"losartan",sameDose:true,importantAdverseEffects:false,importantHealthChanges:false};
test("medicamento permitido y estable es renovable",()=>assert.equal(renewal.evaluatePrescriptionRenewal(renewalBase),"eligible_for_renewal"));
test("medicamento fuera de allowlist no se fuerza",()=>assert.equal(renewal.evaluatePrescriptionRenewal({...renewalBase,medicationId:"tramadol"}),"not_eligible"));
test("efectos adversos requieren revisión",()=>assert.equal(renewal.evaluatePrescriptionRenewal({...renewalBase,importantAdverseEffects:true}),"manual_review"));
test("telemedicina cuesta $19.990",()=>assert.equal(renewal.TELEMEDICINE_PRICE_CLP,19990));

test("IMC 31 sin flags usa vía estándar",()=>assert.equal(weight.evaluateWeightManagement({age:40,bmi:31,comorbidities:[],safety:safe}),"standard_path"));
test("IMC 28 + HTA usa vía estándar",()=>assert.equal(weight.evaluateWeightManagement({age:40,bmi:28,comorbidities:["hypertension"],safety:safe}),"standard_path"));
test("IMC 28 sin comorbilidad no tiene indicación simplificada",()=>assert.equal(weight.evaluateWeightManagement({age:40,bmi:28,comorbidities:[],safety:safe}),"no_simplified_indication"));
test("IMC 25 no tiene indicación simplificada",()=>assert.equal(weight.evaluateWeightManagement({age:40,bmi:25,comorbidities:[],safety:safe}),"no_simplified_indication"));
test("embarazo contraindica la vía simplificada",()=>assert.equal(weight.evaluateWeightManagement({age:40,bmi:31,comorbidities:[],safety:{...safe,pregnant:true}}),"contraindicated_for_simplified_path"));
test("pancreatitis requiere revisión médica",()=>assert.equal(weight.evaluateWeightManagement({age:40,bmi:31,comorbidities:[],safety:{...safe,pancreatitis:true}}),"medical_review_required"));
test("servidor recalcula IMC y outcome",()=>{const s=readFileSync("app/api/new-services/weight-management/route.ts","utf8");assert.match(s,/calculateBmi/);assert.match(s,/evaluateWeightManagement/)});
test("vía estándar cobra $7.990",()=>assert.equal(weight.WEIGHT_MANAGEMENT_PRICE_CLP,7990));
test("revisión médica ofrece $19.990",()=>assert.match(readFileSync("app/control-peso/page.tsx","utf8"),/19\.990/));
test("plantilla de fuerza es versionada",()=>{const t=loadModule("lib/clinical/weight-management-templates.ts");assert.match(t.strengthGuideTemplate.version,/weight-documents/)});
test("pagos de peso modelan documentos finales",()=>{const s=readFileSync("prisma/schema.prisma","utf8");assert.match(s,/finalDocumentPath/)});
test("telemedicina usa índice único por médico y hora",()=>assert.match(readFileSync("prisma/schema.prisma","utf8"),/@@unique\(\[clinicianId, startsAt\]\)/));

test("home usa el nuevo claim",()=>assert.match(readFileSync("components/Services.tsx","utf8"),/a la salud que necesitas\./));
test("home conserva el grupo Exámenes",()=>assert.match(readFileSync("components/Services.tsx","utf8"),/title="Exámenes"/));
test("home muestra las tres órdenes con sus precios",()=>{const s=readFileSync("components/Services.tsx","utf8");for(const value of ["Kinesioterapia","$3.990","Renovar receta","$4.990","Control de peso","$7.990"])assert.ok(s.includes(value),value)});

test("portal médico usa una sola franja blanca con tres menús",()=>{const s=readFileSync("app/portal-medicos/_components/MedicalPortalShell.tsx","utf8");assert.ok(!s.includes("bg-emerald-700 text-white"));for(const value of ["Escritorio","Validación","Administración","Revisar validación automática"])assert.ok(s.includes(value),value)});
test("el isotipo del portal oculta el texto Veramed",()=>assert.match(readFileSync("app/portal-medicos/_components/MedicalPortalShell.tsx","utf8"),/showWordmark=\{false\}/));
test("los servicios nuevos aparecen en validación automática",()=>{const s=readFileSync("lib/server/automatic-orders.ts","utf8");for(const value of ["kinesiology","prescription_renewal","weight_management"])assert.ok(s.includes(value),value)});
test("descuento total produce precio cero",()=>{const {calculateDiscountedAmount}=loadModule("lib/discount-pricing.ts");assert.equal(calculateDiscountedAmount(5990,{type:"percent_off",percentOff:100,label:"Gratis"}).finalAmount,0)});
test("todos los checkouts ocultan Webpay cuando el total es cero",()=>{for(const file of ["app/chequeo/pago/page.tsx","app/control-cronico/pago/page.tsx","app/sintomas/pago/page.tsx","components/NewServiceCheckout.tsx"]){const s=readFileSync(file,"utf8");assert.ok(s.includes("Felicitaciones, tienes tu orden médica gratis 😊"),file);assert.ok(s.includes("finalAmount === 0")||s.includes("amount===0"),file)}});
test("el servidor no llama Transbank para una orden gratuita",()=>{const generic=readFileSync("lib/server/transbank/service.ts","utf8");const symptoms=readFileSync("app/api/sintomas/payments/create/route.ts","utf8");assert.match(generic,/pricing\.finalAmount === 0/);assert.match(generic,/freeOrder: true/);assert.match(symptoms,/pricing\.finalAmount === 0/)});
