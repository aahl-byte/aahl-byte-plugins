#!/usr/bin/env node
// Scaffolds the door machinery into a repo: the signing helper, the e2e request recorder, an empty flag file and the cleanup configs.
import fs from "node:fs";
import path from "node:path";

export const meta = {
  why: "Puts the signing helper, request recorder, empty flag registry and cleanup config into a repo in one step, so every repo starts from the same files.",
  layer: "design",
  takes: ["check-door-flags"],
};

const TEMPLATES = path.join(import.meta.dirname, "templates");

const HELP = `doors install: scaffold the door machinery into a repo

  node install.mjs --repo <dir> [--helper src/lib/doors.ts] [--fixture e2e/doorRequests.ts]
                   [--door-folder <dir>]... [--force]

Writes the signing helper (and its vitest test when the repo uses vitest), the Playwright
request recorder (when the repo uses @playwright/test), doors/config.json, an empty
doors/flags.json, cleanup/config.json and an empty cleanup/seeds.json. Existing files are
kept unless --force.`;

function parseArgs(argv) {
  const out = { doorFolders: [], helper: "src/lib/doors.ts", fixture: "e2e/doorRequests.ts" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (a === "--repo") out.repo = path.resolve(next());
    else if (a === "--helper") out.helper = next();
    else if (a === "--fixture") out.fixture = next();
    else if (a === "--door-folder") out.doorFolders.push(next());
    else if (a === "--force") out.force = true;
    else if (a === "--help" || a === "-h") out.help = true;
    else throw new Error(`unknown argument ${a}`);
  }
  return out;
}

const json = (value) => JSON.stringify(value, null, 2) + "\n";

function plan(repo, opts) {
  const pkg = fs.existsSync(path.join(repo, "package.json")) ? JSON.parse(fs.readFileSync(path.join(repo, "package.json"), "utf8")) : {};
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const helperBase = path.basename(opts.helper, path.extname(opts.helper));
  const template = (f) => fs.readFileSync(path.join(TEMPLATES, f), "utf8");
  const files = [[opts.helper, template("doors.ts")]];
  if (deps.vitest) {
    const testFile = path.join(path.dirname(opts.helper), `${helperBase}.test.ts`);
    files.push([testFile, template("doors.test.ts").replace('from "./doors"', `from "./${helperBase}"`)]);
  }
  if (deps["@playwright/test"]) files.push([opts.fixture, template("doorRequests.ts")]);
  files.push([
    "doors/config.json",
    json({
      helper: opts.helper,
      signers: ["signOutput", "signRequest", "signAction"],
      doorFolders: opts.doorFolders.map((p) => ({ path: p, why: "" })),
      sources: ["src"],
      ignore: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx", "**/*.d.ts"],
      requestLog: "test-results/door-requests",
    }),
  ]);
  files.push(["doors/flags.json", json({ flags: [] })]);
  files.push(["cleanup/config.json", template("cleanup-config.json")]);
  files.push(["cleanup/seeds.json", json({ seeds: [] })]);
  return files;
}

function main(argv) {
  const opts = parseArgs(argv);
  if (opts.help || !opts.repo) {
    console.log(HELP);
    return opts.help ? 0 : 2;
  }
  for (const [rel, content] of plan(opts.repo, opts)) {
    const abs = path.join(opts.repo, rel);
    if (fs.existsSync(abs) && !opts.force) {
      console.log(`kept ${rel}`);
      continue;
    }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
    console.log(`wrote ${rel}`);
  }
  console.log(`
next:
  - give each door folder in doors/config.json a one-line why
  - add the recorder as an auto fixture: recordDoorRequests({ context, baseURL }, use, testInfo)
  - run the checker in the gate: node <pstack>/scripts/doors/check.mjs --report-only --files <changed files>`);
  return 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (e) {
  process.stderr.write(`doors install: ${e.message}\n`);
  process.exitCode = 2;
}
