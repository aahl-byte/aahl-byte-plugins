// One pass over a repo's source with ESLint's Linter: which files are doors, where each flag's pattern occurs,
// raw interactive JSX, and hand-written signatures. ESLint and the TypeScript parser come from the repo's own node_modules.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { importMatcher, selectorFor } from "./patterns.mjs";

const OWN_DIR = path.resolve(import.meta.dirname, "..");
const SIGNATURE_STRING = /^(x-door|data-door)$/i;
const WHY_COMMENT = /^\s*\*?\s*why:\s*(.+?)\s*$/i;

/** A glob such as `**\/*.test.ts` or `src/components/ui/**` as a RegExp over repo-relative paths. */
export function globRe(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      if (glob[i + 2] === "/") {
        re += "(?:.*/)?";
        i += 2;
      } else {
        re += ".*";
        i += 1;
      }
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

function requireFrom(dirs, id) {
  for (const dir of dirs) {
    try {
      const req = createRequire(path.join(dir, "package.json"));
      return { mod: req(id), path: req.resolve(id) };
    } catch {}
  }
  return null;
}

/** ESLint's Linter and a TypeScript-aware parser, from the repo first and this package's own install second. */
export function loadTools(repo) {
  const dirs = [repo, OWN_DIR];
  const eslint = requireFrom(dirs, "eslint");
  if (!eslint) throw new Error(`no eslint in ${repo}/node_modules (or ${OWN_DIR}/node_modules: run npm ci there)`);
  const parser = requireFrom(dirs, "@typescript-eslint/parser") ?? requireFrom(dirs, "typescript-eslint");
  if (!parser) throw new Error(`no @typescript-eslint/parser in ${repo}/node_modules`);
  const esquery = createRequire(eslint.path)("esquery");
  return { Linter: eslint.mod.Linter, parser: parser.mod.parser ?? parser.mod, esquery, from: { eslint: eslint.path, parser: parser.path } };
}

/** Source files under config.sources, tracked or untracked-but-not-ignored, minus config.ignore and the helper. */
export function sourceFiles(repo, config) {
  let listed;
  try {
    listed = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "--", ...config.sources], {
      cwd: repo,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    listed = "";
  }
  const ignore = config.ignore.map(globRe);
  return [...new Set(listed.split("\n").filter(Boolean))]
    .filter((f) => config.extensions.includes(path.extname(f)))
    .filter((f) => f !== config.helper && !ignore.some((re) => re.test(f)))
    .filter((f) => fs.existsSync(path.join(repo, f)))
    .sort();
}

export function doorFolderOf(file, config) {
  return config.doorFolders.find((d) => file === d.path || file.startsWith(d.path.replace(/\/$/, "") + "/")) ?? null;
}

const stringValue = (node) => {
  if (!node) return null;
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) return node.quasis[0].value.cooked;
  return null;
};

function moduleSpecifier(node) {
  if (node.type === "CallExpression") return node.callee.type === "Identifier" && node.callee.name === "require" ? stringValue(node.arguments[0]) : null;
  return stringValue(node.source);
}

/**
 * Scans every source file. Returns, per file, its door facts, flag hits, raw interactive JSX and forged
 * signatures, plus any flag whose selector doesn't parse.
 */
export function scanRepo(repo, { config, flags }) {
  const tools = loadTools(repo);
  const flagErrors = [];
  const selectorFlags = [];
  const importFlags = [];
  for (const flag of flags) {
    if (flag.kind === "endpoint") continue;
    if (flag.kind === "import") {
      importFlags.push({ flag, match: importMatcher(flag.pattern) });
      continue;
    }
    const selector = selectorFor(flag);
    try {
      tools.esquery.parse(selector);
      selectorFlags.push({ flag, selector });
    } catch (e) {
      flagErrors.push(`flag ${flag.id}: pattern "${flag.pattern}" is not a valid selector (${e.message})`);
    }
  }

  const signers = new Set(config.signers);
  const rawTags = new Set(config.rawElements);
  let facts;

  const rule = {
    meta: { type: "problem", schema: [] },
    create(context) {
      const source = context.sourceCode;
      const at = (node) => ({ line: node.loc.start.line, column: node.loc.start.column + 1 });
      const text = (node) => source.getText(node).split("\n")[0].trim().slice(0, 120);
      const handlers = new Map();
      const on = (selector, fn) => handlers.set(selector, [...(handlers.get(selector) ?? []), fn]);

      for (const { flag, selector } of selectorFlags) on(selector, (node) => facts.hits.push({ flag: flag.id, ...at(node), text: text(node) }));

      const onImport = (node) => {
        const spec = moduleSpecifier(node);
        if (spec === null) return;
        for (const { flag, match } of importFlags) if (match(spec)) facts.hits.push({ flag: flag.id, ...at(node), text: text(node) });
      };
      for (const sel of ["ImportDeclaration", "ExportAllDeclaration", "ExportNamedDeclaration[source]", "ImportExpression", "CallExpression[callee.name='require']"]) on(sel, onImport);

      on("CallExpression", (node) => {
        if (node.callee.type !== "Identifier" || !signers.has(node.callee.name)) return;
        facts.signs.push({ signer: node.callee.name, name: stringValue(node.arguments[0]) ?? "(dynamic)", ...at(node) });
      });

      on("JSXOpeningElement", (node) => {
        if (node.name.type !== "JSXIdentifier" || !/^[a-z]/.test(node.name.name)) return;
        const tag = node.name.name;
        const events = node.attributes.filter((a) => a.type === "JSXAttribute" && a.name.type === "JSXIdentifier" && /^on[A-Z]/.test(a.name.name)).map((a) => a.name.name);
        if (rawTags.has(tag)) facts.raw.push({ kind: "element", tag, handlers: events, ...at(node) });
        else if (events.length) facts.raw.push({ kind: "handler", tag, handlers: events, ...at(node) });
      });

      on("JSXAttribute", (node) => {
        if (node.name.type === "JSXIdentifier" && node.name.name === "data-door") facts.forged.push({ ...at(node), text: text(node) });
      });
      on("Literal", (node) => {
        if (typeof node.value === "string" && SIGNATURE_STRING.test(node.value) && node.parent?.type !== "JSXAttribute") facts.forged.push({ ...at(node), text: text(node.parent ?? node) });
      });

      on("ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name='meta'] > ObjectExpression > Property", (node) => {
        const key = node.key.type === "Identifier" ? node.key.name : stringValue(node.key);
        if (key === "why") facts.why ??= stringValue(node.value);
      });

      on("Program", () => {
        for (const c of source.getAllComments()) {
          if (c.loc.start.line > 30) break;
          for (const l of c.value.split("\n")) {
            const m = WHY_COMMENT.exec(l);
            if (m) {
              facts.whyComment ??= m[1];
              break;
            }
          }
        }
      });

      const visitors = {};
      for (const [sel, fns] of handlers) visitors[sel] = (node) => fns.forEach((fn) => fn(node));
      return visitors;
    },
  };

  const linter = new tools.Linter({ cwd: repo });
  const lintConfig = [
    {
      // ESLint never counts a bare "**/*" as matching a file, so each extension is named.
      files: config.extensions.map((ext) => `**/*${ext}`),
      languageOptions: {
        parser: tools.parser,
        ecmaVersion: "latest",
        sourceType: "module",
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
      plugins: { doors: { rules: { scan: rule } } },
      rules: { "doors/scan": "error" },
    },
  ];

  const files = [];
  for (const file of sourceFiles(repo, config)) {
    facts = { file, hits: [], signs: [], raw: [], forged: [], why: null, whyComment: null, error: null };
    const code = fs.readFileSync(path.join(repo, file), "utf8");
    const messages = linter.verify(code, lintConfig, { filename: path.join(repo, file) });
    const fatal = messages.find((m) => m.fatal);
    if (fatal) facts.error = `${fatal.line}:${fatal.column} ${fatal.message}`;
    const folder = doorFolderOf(file, config);
    const names = [...new Set(facts.signs.map((s) => s.name))];
    const isDoor = Boolean(folder) || names.length > 0;
    files.push({
      file,
      door: isDoor
        ? { names: names.length ? names : [path.basename(file, path.extname(file))], why: facts.why ?? facts.whyComment ?? folder?.why ?? null, folder: folder?.path ?? null }
        : null,
      hits: facts.hits,
      raw: folder ? [] : facts.raw,
      forged: facts.forged,
      error: facts.error,
    });
  }
  return { files, flagErrors, tools: tools.from };
}
