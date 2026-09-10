import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { loadModule } from './helpers/load-typescript.mjs';
const { getGoogleAuthCredentials } = loadModule('lib/server/google-auth-config.ts');
test('no configura un proveedor inválido sin ambas credenciales', () => {
 assert.equal(getGoogleAuthCredentials({}), null);
 assert.equal(getGoogleAuthCredentials({AUTH_GOOGLE_ID:'client'}), null);
 assert.equal(getGoogleAuthCredentials({AUTH_GOOGLE_SECRET:'secret'}), null);
 assert.deepEqual(getGoogleAuthCredentials({AUTH_GOOGLE_ID:' client ',AUTH_GOOGLE_SECRET:' secret '}),{clientId:'client',clientSecret:'secret'});
 assert.deepEqual(getGoogleAuthCredentials({GOOGLE_CLIENT_ID:'client',GOOGLE_CLIENT_SECRET:'secret'}),{clientId:'client',clientSecret:'secret'});
});
const source=readFileSync(new URL('../app/ingresar/page.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let declaration;
function visit(node){if(ts.isFunctionDeclaration(node)&&node.name?.text==='handleGoogleSignIn')declaration=node;ts.forEachChild(node,visit)}visit(ast);
function handler(context){const {outputText}=ts.transpileModule(declaration.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});return vm.runInNewContext(outputText+'\nhandleGoogleSignIn',context)}
function harness(providers){const state={busy:false,error:'',calls:[]};const run=handler({googleSubmitting:false,setGoogleSubmitting:v=>state.busy=v,setError:v=>state.error=v,getProviders:async()=>providers,signIn:async(...args)=>state.calls.push(args),GOOGLE_ERROR_MESSAGES:{Configuration:'Google no disponible',OAuthSignin:'Error de conexión'}});return{state,run}}
test('inicia OAuth con el SDK y vuelve al endpoint de sincronización',async()=>{const h=harness({google:{id:'google'}});await h.run();assert.equal(h.state.calls.length,1);assert.equal(h.state.calls[0][0],'google');assert.equal(h.state.calls[0][1].callbackUrl,'/auth/google/complete');assert.equal(h.state.busy,true)});
test('sin proveedor configurado conserva la pantalla y permite reintentar',async()=>{const h=harness({});await h.run();assert.equal(h.state.calls.length,0);assert.equal(h.state.error,'Google no disponible');assert.equal(h.state.busy,false)});
