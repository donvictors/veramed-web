import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import ts from "typescript";

const root = resolve(import.meta.dirname, "../..");
const nativeRequire = createRequire(import.meta.url);
// Run the real TypeScript modules; substitute external services, never patient data or live DB.
export function loadModule(file, mocks = {}) {
  const cache = new Map();
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const compiled = { exports: {} }; cache.set(path, compiled);
    const source = readFileSync(path, "utf8");
    const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } });
    const require = name => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name === "server-only") return {};
      if (name.startsWith("@/") || name.startsWith(".")) {
        const base = name.startsWith("@/") ? resolve(root, name.slice(2)) : resolve(dirname(path), name);
        const found = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find(path => existsSync(path) && /\.tsx?$/.test(path));
        if (found) return load(found);
      }
      return nativeRequire(name);
    };
    new Function("require", "module", "exports", outputText)(require, compiled, compiled.exports);
    return compiled.exports;
  }
  return load(resolve(root, file));
}
