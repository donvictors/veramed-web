import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../app/sintomas/page.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function loadFunction(name, context) {
  let declaration;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) declaration = node;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  assert.ok(declaration, `Missing function ${name}`);
  const { outputText } = ts.transpileModule(declaration.getText(ast), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  return vm.runInNewContext(`${outputText}\n${name}`, context);
}

function loadQuestions() {
  const declaration = ast.statements.flatMap(statement => ts.isVariableStatement(statement) ? [...statement.declarationList.declarations] : [])
    .find(node => node.name.getText(ast) === 'ANTECEDENT_QUESTIONS');
  return vm.runInNewContext(declaration.initializer.getText(ast));
}

function harness(fetch) {
  const state = { status: 'antecedents', error: '', stored: null };
  const noop = () => {};
  const context = {
    interpretationInFlightRef: { current: false },
    setStatus: value => { state.status = value; },
    setError: value => { state.error = value; },
    setProgress: noop, setMessageIndex: noop, setResult: noop, setUrgencyAcknowledged: noop,
    fetch, symptomsText: 'Relato de prueba', nameFields: {}, joinPatientFullName: () => 'Prueba',
    rut: '', birthDate: '', email: '', phone: '', address: '', sex: 'female', patientAge: 30,
    consentToAiProcessing: true, acknowledgesMedicalReview: true,
    PROCESSING_MESSAGES: [], PROCESSING_PROGRESS_POINTS: [], PROCESSING_BASE_DELAYS_MS: [],
    STORAGE_KEY: 'test',
    window: { sessionStorage: { setItem: (_, value) => { state.stored = JSON.parse(value); } } },
  };
  return { state, context, run: loadFunction('runInterpretation', context) };
}

test('el envío final incluye la última respuesta, incluso antes del siguiente render', async () => {
  let submitted;
  let scheduled;
  const original = { medicalHistory: 'No', chronicMedication: '' };
  const submit = loadFunction('handleAntecedentAnswerSubmit', {
    status: 'antecedents', isAntecedentBotTyping: false, antecedentInput: 'Sí',
    ANTECEDENT_QUESTIONS: loadQuestions(), antecedentQuestionIndex: 1,
    antecedentAnswers: original,
    setAntecedentAnswers() {}, setAntecedentMessages() {}, setAntecedentInput() {},
    setIsAntecedentBotTyping() {}, typingTimeoutRef: { current: null },
    window: { setTimeout: fn => { scheduled = fn; return 1; } },
    runInterpretation: answers => { submitted = answers; },
  });
  submit({ preventDefault() {} });
  scheduled();
  assert.equal(submitted.chronicMedication, 'Sí');
  assert.equal(submitted.medicalHistory, 'No');
  assert.equal(original.chronicMedication, '');
});

test('un error muestra recuperación; reintentar conserva los antecedentes', async () => {
  const sent = [];
  const h = harness(async (_, options) => {
    sent.push(JSON.parse(options.body));
    return sent.length === 1
      ? { ok: false, json: async () => ({ error: 'Servicio no disponible' }) }
      : { ok: true, json: async () => ({ requestId: 'test', interpretation: {} }) };
  });
  const answers = { chronicMedication: 'Sí', medicalHistory: 'No' };
  await h.run(answers);
  assert.equal(h.state.status, 'processing_error');
  assert.equal(h.state.error, 'Servicio no disponible');
  await h.run(answers);
  assert.equal(h.state.status, 'ready');
  assert.deepEqual(sent[0].antecedents, answers);
  assert.deepEqual(sent[1].antecedents, answers);
  assert.deepEqual(h.state.stored.antecedents, answers);
});

test('bloquea solicitudes simultáneas y permite reintentar tras un fallo de red', async () => {
  let reject;
  let calls = 0;
  const h = harness(() => { calls++; return new Promise((_, fail) => { reject = fail; }); });
  const pending = h.run({ chronicMedication: 'No' });
  await h.run({ chronicMedication: 'No' });
  assert.equal(calls, 1);
  reject(new Error('Network failed'));
  await pending;
  assert.equal(h.state.status, 'processing_error');
  assert.equal(h.context.interpretationInFlightRef.current, false);
});

test('antecedentes pide solo enfermedades o cirugías importantes y medicamentos', () => {
  const questions = loadQuestions();
  assert.equal(questions.length, 2);
  assert.equal(questions[0].key, 'medicalHistory');
  assert.equal(questions[0].prompt, '¿Tienes alguna enfermedad o cirugía importante? ¿cuál?');
  assert.equal(questions[1].key, 'chronicMedication');
});

test('el resumen termina con un único punto aunque IA ya entregue puntuación', () => {
  const format = loadFunction('formatClinicalSentence', {});
  for (const value of ['Dolor genital', 'Dolor genital.', 'Dolor genital...', ' Dolor genital.…  ']) {
    assert.equal(format(value), 'Dolor genital.');
  }
  assert.equal(format('¿Es dolor?'), '¿Es dolor?');
  assert.equal(format(''), '');
  assert.equal(format(undefined), '');
});

test('cada cambio de etapa vuelve al inicio sin que el foco desplace la página', () => {
  let scrollEffect;
  let focusEffect;
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect') {
      const callback = node.arguments[0];
      const body = callback.getText(ast);
      if (body.includes('window.scrollTo')) scrollEffect = body;
      if (body.includes('antecedentInputRef.current?.focus')) focusEffect = body;
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  const calls = [];
  const window = { scrollTo: options => calls.push(options), requestAnimationFrame: fn => { fn(); return 1; } };
  for (const status of ['idle', 'antecedents', 'processing', 'ready']) {
    vm.runInNewContext(`(${scrollEffect})()`, { status, window });
  }
  assert.equal(calls.length, 3);
  for (const options of calls) assert.equal(options.top, 0);
  let focusOptions;
  vm.runInNewContext(`(${focusEffect})()`, {
    status: 'antecedents', isAntecedentBotTyping: false, window,
    antecedentInputRef: { current: { focus: options => { focusOptions = options; } } },
  });
  assert.equal(focusOptions.preventScroll, true);
});
