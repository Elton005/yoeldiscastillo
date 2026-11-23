import ts from "typescript";
import { readdir, readFile, access } from "node:fs/promises";
import { resolve, relative, dirname, sep } from "node:path";
const root = resolve("src"),
  graph = new Map();
async function files(folder) {
  const result = [];
  for (const item of await readdir(folder, { withFileTypes: true })) {
    const path = resolve(folder, item.name);
    if (item.isDirectory()) result.push(...(await files(path)));
    else if (/\.(ts|tsx)$/.test(item.name)) result.push(path);
  }
  return result;
}
const sourceFiles = await files(root);
const options = {
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  resolveJsonModule: true,
  jsx: ts.JsxEmit.ReactJSX,
};
for (const file of sourceFiles) {
  const source = ts.createSourceFile(
    file,
    await readFile(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const edges = [];
  function visit(node) {
    let specifier;
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      specifier = node.moduleSpecifier.text;
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    )
      specifier = node.arguments[0].text;
    if (specifier?.startsWith(".") && !specifier.endsWith(".css")) {
      const target = ts.resolveModuleName(specifier, file, options, ts.sys)
        .resolvedModule?.resolvedFileName;
      if (!target)
        throw new Error(
          `Import inexistente: ${relative(root, file)} -> ${specifier}`,
        );
      const normalized = resolve(target);
      if (normalized.startsWith(root + sep) && /\.tsx?$/.test(normalized))
        edges.push(normalized);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  graph.set(file, edges);
  const layer = relative(root, file).split(sep)[0];
  const forbidden =
    {
      components: ["pages", "admin"],
      auth: ["pages", "admin"],
      services: ["components", "pages", "admin", "auth"],
      models: ["components", "pages", "admin", "auth", "services"],
    }[layer] || [];
  for (const target of edges)
    if (forbidden.includes(relative(root, target).split(sep)[0]))
      throw new Error(
        `Dependencia de capas inválida: ${relative(root, file)} -> ${relative(root, target)}`,
      );
}
const active = new Set(),
  done = new Set(),
  reachable = new Set();
function visit(file, stack = []) {
  if (active.has(file))
    throw new Error(
      `Dependencia circular: ${[...stack, file].map((path) => relative(root, path)).join(" -> ")}`,
    );
  if (done.has(file)) return;
  active.add(file);
  for (const target of graph.get(file) || []) visit(target, [...stack, file]);
  active.delete(file);
  done.add(file);
}
for (const file of graph.keys()) visit(file);
function mark(file) {
  if (reachable.has(file)) return;
  reachable.add(file);
  for (const target of graph.get(file) || []) mark(target);
}
for (const entry of ["main.tsx", "entry-server.tsx"])
  mark(resolve(root, entry));
for (const file of graph.keys())
  if (!reachable.has(file))
    throw new Error(`Módulo sin uso: ${relative(root, file)}`);
// All relative CSS imports must resolve after the style consolidation.
for (const file of [
  resolve("src/styles.css"),
  ...(await readdir(resolve("src/styles")))
    .filter((name) => name.endsWith(".css"))
    .map((name) => resolve("src/styles", name)),
]) {
  const css = await readFile(file, "utf8");
  for (const match of css.matchAll(/@import\s+["'](\.[^"']+)["']/g))
    await access(resolve(dirname(file), match[1]));
}
console.log(
  `Arquitectura correcta: ${graph.size} módulos usados, imports resueltos y sin dependencias circulares.`,
);
