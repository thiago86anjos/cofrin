/*
  Finds unused component/screen files under src/components and src/screens.
  Criteria (safe): file is not referenced by any static import/export or dynamic import()
  anywhere under src (excluding __tests__), based on TypeScript AST.

  Usage:
    node scripts/prune-unused-components.js --dry
    node scripts/prune-unused-components.js --apply
*/

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, 'src');

const APPLY = process.argv.includes('--apply');
const DRY = process.argv.includes('--dry') || !APPLY;

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function walk(dir) {
  /** @type {string[]} */
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function isUnderTests(filePath) {
  const norm = filePath.split(path.sep).join('/');
  return norm.includes('/__tests__/');
}

/**
 * Try resolving an import specifier to a file inside src.
 * Supports:
 * - relative paths
 * - src/... absolute-from-src style
 */
function resolveModule(importerFile, spec) {
  if (!spec || typeof spec !== 'string') return null;

  // ignore packages
  const isRelative = spec.startsWith('./') || spec.startsWith('../');
  const isSrcAbsolute = spec.startsWith('src/');
  if (!isRelative && !isSrcAbsolute) return null;

  let base;
  if (isSrcAbsolute) {
    base = path.join(projectRoot, spec);
  } else {
    base = path.resolve(path.dirname(importerFile), spec);
  }

  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];

  for (const c of candidates) {
    if (isFile(c)) {
      // Only care about files inside src
      const rel = path.relative(srcRoot, c);
      if (!rel.startsWith('..')) return path.resolve(c);
    }
  }

  return null;
}

function collectModuleSpecifiers(sf) {
  /** @type {string[]} */
  const specs = [];

  function visit(node) {
    // import ... from 'x'
    if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specs.push(node.moduleSpecifier.text);
    }

    // export ... from 'x'
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specs.push(node.moduleSpecifier.text);
    }

    // dynamic import('x')
    if (ts.isCallExpression(node) && node.expression && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [arg] = node.arguments;
      if (arg && ts.isStringLiteral(arg)) specs.push(arg.text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sf);
  return specs;
}

function main() {
  if (!isFile(path.join(projectRoot, 'package.json')) || !fs.existsSync(srcRoot)) {
    console.error('Run this from the repo root (where package.json and src/ exist).');
    process.exit(1);
  }

  // Include src/* and root entrypoints (App.tsx, index.ts, etc.), because they may import from src/.
  const rootTsEntrypoints = fs
    .readdirSync(projectRoot, { withFileTypes: true })
    .filter((ent) => ent.isFile())
    .map((ent) => path.join(projectRoot, ent.name))
    .filter((p) => /\.(ts|tsx)$/.test(p));

  const allSrcFiles = [...walk(srcRoot), ...rootTsEntrypoints]
    // Include tests as importers (to avoid deleting components used only in tests)
    .filter((p) => /\.(ts|tsx)$/.test(p));

  /** @type {Set<string>} */
  const referenced = new Set();

  for (const file of allSrcFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const sf = ts.createSourceFile(file, content, ts.ScriptTarget.ESNext, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const specs = collectModuleSpecifiers(sf);

    for (const spec of specs) {
      const resolved = resolveModule(file, spec);
      if (resolved) referenced.add(resolved);
    }
  }

  const componentRoots = [path.join(srcRoot, 'components'), path.join(srcRoot, 'screens')];
  const candidates = componentRoots
    .flatMap((dir) => (fs.existsSync(dir) ? walk(dir) : []))
    .filter((p) => /\.(ts|tsx)$/.test(p) && !isUnderTests(p));

  const unused = candidates.filter((file) => !referenced.has(path.resolve(file)));

  // Extra safety: don't delete screens that are entrypoints (e.g., src/navigation)
  // This script only targets components/ and screens/, so navigation isn't in candidates.

  if (unused.length === 0) {
    console.log('No unused component/screen files found.');
    return;
  }

  const relUnused = unused
    .map((p) => path.relative(projectRoot, p).split(path.sep).join('/'))
    .sort();

  console.log(JSON.stringify({ mode: DRY ? 'dry' : 'apply', count: relUnused.length, files: relUnused }, null, 2));

  if (APPLY) {
    for (const abs of unused) {
      fs.unlinkSync(abs);
    }
    console.log(`Deleted ${unused.length} files.`);
  }
}

main();
