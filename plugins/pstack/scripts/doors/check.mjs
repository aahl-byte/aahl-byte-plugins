#!/usr/bin/env node
// doors check: computes each flag's observed authorities and prints the discovery message for unsigned code using it.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadDoors } from "./lib/config.mjs";
import { endpointMatcher, labelFor } from "./lib/patterns.mjs";
import { readRequestLog } from "./lib/requests.mjs";
import { scanRepo } from "./lib/scan.mjs";

export const meta = {
  why: "Finds unsigned code using a flagged pattern and answers with the doors that own it and the flag's probing questions.",
  layer: "check",
  takes: ["check-door-flags"],
};

const HELP = `doors check: flag findings with their authorities and probing questions

  node check.mjs [--repo <dir>] [--files a.tsx,b.ts] [--json <file>] [--report-only]

Reads <repo>/doors/config.json and doors/flags.json. A door is a file that calls a signing
helper or lives in a door folder; every door using a flag's pattern is an authority on it.
Unsigned code using the pattern gets the discovery message. Endpoint flags read the e2e
request log named by config.requestLog.

  --files        report findings only in these files (authorities still come from the whole repo)
  --json         also write the full result as JSON
  --report-only  print findings and exit 0

Exit: 0 nothing to report, 1 findings, 2 a broken flag or config.`;

const HAND_SIGNED = "a signature written by hand; only the signing helper writes data-door and X-Door";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const andList = (xs) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

function forgeries(scan, only) {
  const forged = [];
  const owners = new Map();
  for (const f of scan.files) {
    if (!f.door || f.door.folder) continue;
    for (const name of f.door.names) if (name !== "(dynamic)") owners.set(name, [...(owners.get(name) ?? []), f.file]);
  }
  for (const [name, files] of owners) {
    if (files.length < 2) continue;
    const sorted = [...files].sort();
    if (only && !sorted.some((f) => only.has(f))) continue;
    forged.push({ file: sorted[0], line: null, column: null, text: name, reason: `door name "${name}" is signed in ${andList(sorted)}; a name belongs to one door` });
  }
  for (const f of scan.files) {
    if (f.door?.folder || (only && !only.has(f.file))) continue;
    for (const x of f.forged) forged.push({ file: f.file, line: x.line, column: x.column, text: x.text, reason: HAND_SIGNED });
  }
  return forged.sort((a, b) => a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0));
}

/**
 * Scans the repo and returns every flag with its authorities (declared first, then observed) and findings,
 * plus forged signatures, the doors found and any errors.
 */
export function checkFlags(repo, { files } = {}) {
  const { config, flags, errors } = loadDoors(repo);
  const scan = scanRepo(repo, { config, flags });
  errors.push(...scan.flagErrors);
  const broken = new Set(scan.flagErrors.map((e) => /^flag (\S+):/.exec(e)?.[1]));
  const only = files?.length ? new Set(files) : null;
  const doors = scan.files.filter((f) => f.door).map((f) => ({ file: f.file, names: f.door.names, why: f.door.why, folder: f.door.folder }));
  const doorByName = new Map();
  for (const d of doors) for (const n of d.names) if (!doorByName.has(n)) doorByName.set(n, d);
  const whyOfFile = (file) => doors.find((d) => d.file === file)?.why ?? null;
  const requests = readRequestLog(repo, config.requestLog);

  const results = flags
    .filter((flag) => !broken.has(flag.id))
    .map((flag) => {
      const observed = new Map();
      const findings = [];
      if (flag.kind === "endpoint") {
        const match = endpointMatcher(flag.pattern);
        for (const r of requests) {
          if (!match(r.method, r.path)) continue;
          if (r.door) {
            const d = doorByName.get(r.door);
            observed.set(r.door, { door: r.door, file: d?.file ?? null, why: d?.why ?? null });
          } else findings.push({ file: r.spec, line: null, column: null, test: r.test, count: r.count, text: `${r.method} ${r.path}` });
        }
      } else {
        for (const f of scan.files) {
          const hits = f.hits.filter((h) => h.flag === flag.id);
          if (!hits.length) continue;
          if (f.door) for (const name of f.door.names) observed.set(name, { door: name, file: f.file, why: f.door.why });
          else if (!only || only.has(f.file)) for (const h of hits) findings.push({ file: f.file, line: h.line, column: h.column, text: h.text });
        }
      }
      const authorities = flag.authorities.map((a) => {
        const seen = observed.get(a.door);
        observed.delete(a.door);
        const file = a.file ?? seen?.file ?? doorByName.get(a.door)?.file ?? null;
        return { door: a.door, file, why: a.why ?? seen?.why ?? (file ? whyOfFile(file) : null), source: "declared" };
      });
      const rest = [...observed.values()].sort((x, y) => x.door.localeCompare(y.door));
      for (const o of rest) authorities.push({ ...o, source: "observed" });
      return { id: flag.id, kind: flag.kind, label: labelFor(flag), why: flag.why, questions: flag.questions, authorities, findings };
    });

  const forged = forgeries(scan, only);
  const findings = results.reduce((n, f) => n + f.findings.length, 0);
  return {
    flags: results,
    forged,
    doors,
    errors,
    parseErrors: scan.files.filter((f) => f.error).map((f) => ({ file: f.file, error: f.error })),
    summary: { findings, forged: forged.length, flags: results.length, flagsFiring: results.filter((f) => f.findings.length).length, doors: doors.length },
    tools: scan.tools,
  };
}

/** The message unsigned code gets: where, the components that own the pattern and what each is for, then the questions. */
export function discoveryMessage(flag) {
  const out = flag.findings.map((f) =>
    f.line == null ? `✗ ${f.text} from ${f.file} ("${f.test}") isn't signed.` : `✗ ${flag.label} at ${f.file}:${f.line} isn't signed.`
  );
  out.push("");
  if (flag.authorities.length) {
    out.push(`Components that own ${flag.label}:`);
    const width = Math.max(...flag.authorities.map((a) => a.door.length));
    for (const a of flag.authorities) {
      const why = a.why ?? "(no why yet: add export const meta = { why } to its file)";
      out.push(`  ${a.door.padEnd(width)}  ${why}${a.file ? ` (${a.file})` : ""}`);
    }
  } else out.push(`No component owns ${flag.label} yet.`);
  out.push("", "Questions:", ...flag.questions.map((q) => `  • ${q}`));
  return out.join("\n");
}

export function summaryLine({ summary }) {
  if (summary.findings + summary.forged === 0) return `doors: no findings (${plural(summary.flags, "flag")}, ${plural(summary.doors, "door")})`;
  return `doors: ${plural(summary.findings, "finding")} across ${plural(summary.flagsFiring, "flag")}, ${summary.forged} forged`;
}

export function renderText(result) {
  const blocks = result.flags.filter((f) => f.findings.length).map(discoveryMessage);
  if (result.forged.length) blocks.push(result.forged.map((f) => `✗ ${f.file}${f.line ? `:${f.line}` : ""} ${f.reason}`).join("\n"));
  if (result.errors.length) blocks.push(result.errors.map((e) => `doors config: ${e}`).join("\n"));
  if (result.parseErrors.length) blocks.push(result.parseErrors.map((p) => `doors: could not parse ${p.file} (${p.error})`).join("\n"));
  blocks.push(summaryLine(result));
  return blocks.join("\n\n");
}

function parseArgs(argv) {
  const out = { files: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (a === "--repo") out.repo = path.resolve(next());
    else if (a === "--json") out.json = path.resolve(next());
    else if (a === "--files") out.files.push(...next().split(",").filter(Boolean));
    else if (a === "--report-only") out.reportOnly = true;
    else if (a === "--help" || a === "-h") out.help = true;
    else throw new Error(`unknown argument ${a}`);
  }
  return out;
}

function repoRoot(cwd) {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return cwd;
  }
}

function main(argv) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log(HELP);
    return 0;
  }
  const repo = opts.repo ?? repoRoot(process.cwd());
  const result = checkFlags(repo, { files: opts.files });
  if (opts.json) fs.writeFileSync(opts.json, JSON.stringify(result, null, 2) + "\n");
  console.log(renderText(result));
  if (opts.reportOnly) return 0;
  if (result.errors.length) return 2;
  return result.summary.findings + result.summary.forged > 0 ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`doors check: ${e.message}\n`);
    process.exitCode = 2;
  }
}
