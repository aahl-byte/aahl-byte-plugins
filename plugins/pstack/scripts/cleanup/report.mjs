#!/usr/bin/env node
// cleanup report: duplicates, flag findings, raw interactive JSX, unsigned e2e requests and seed items, as JSON and markdown.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { checkFlags, discoveryMessage } from "../doors/check.mjs";
import { loadDoors } from "../doors/lib/config.mjs";
import { readRequestLog } from "../doors/lib/requests.mjs";
import { globRe } from "../doors/lib/scan.mjs";
import { duplicateItems, runJscpd } from "./lib/duplicates.mjs";

export const meta = {
  why: "Collects everything a cleanup round reads into one deterministic report, so triage works from the same list a person can rerun.",
  layer: "check",
  takes: ["report-cleanup"],
};

export const CLEANUP_CONFIG = "cleanup/config.json";
export const SECTIONS = {
  duplicates: "Duplicates",
  flags: "Flag findings",
  "raw-elements": "Raw interactive elements",
  "unsigned-requests": "Unsigned requests",
  seeds: "Seeds",
};

const HELP = `cleanup report: the list a cleanup round triages

  node report.mjs --repo <dir> --out <dir>

Writes <out>/report.json and <out>/report.md. Reads cleanup/config.json (duplicates,
requests, seeds) and doors/config.json + doors/flags.json from the repo.`;

/** The repo's cleanup config over the defaults. */
export function loadCleanupConfig(repo, doorsConfig) {
  const file = path.join(repo, CLEANUP_CONFIG);
  const raw = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  return {
    ...raw,
    duplicates: {
      paths: doorsConfig.sources,
      formats: ["typescript", "tsx", "javascript", "jsx", "scss", "css"],
      ignore: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts"],
      minTokens: 50,
      ...raw.duplicates,
    },
    requests: { ignore: [], ...raw.requests },
    seeds: raw.seeds ?? "cleanup/seeds.json",
  };
}

/** A short id-safe form of a path: `src/components/Screen.tsx` → `components-screen`. */
export function slug(s, max = 40) {
  const out = s
    .replace(/^src\//, "")
    .replace(/\.[A-Za-z]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (out.length <= max) return out;
  return `${out.slice(0, max - 5).replace(/-+$/, "")}-${createHash("sha1").update(out).digest("hex").slice(0, 4)}`;
}

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function flagItems(result) {
  const items = [];
  for (const flag of result.flags) {
    if (flag.kind === "endpoint") continue;
    const byFile = new Map();
    for (const f of flag.findings) byFile.set(f.file, [...(byFile.get(f.file) ?? []), f]);
    for (const [file, findings] of [...byFile].sort(([a], [b]) => a.localeCompare(b))) {
      items.push({
        id: `flag-${flag.id}-${slug(file)}`,
        section: "flags",
        kind: "flag",
        flag: flag.id,
        title: `${flag.label} unsigned in ${file} (${findings.length})`,
        files: [file],
        evidence: [discoveryMessage({ ...flag, findings })],
        size: { files: 1, lines: findings.length },
      });
    }
  }
  const forgedByFile = new Map();
  for (const f of result.forged) forgedByFile.set(f.file, [...(forgedByFile.get(f.file) ?? []), f]);
  for (const [file, list] of [...forgedByFile].sort(([a], [b]) => a.localeCompare(b))) {
    items.push({
      id: `forged-${slug(file)}`,
      section: "flags",
      kind: "forged",
      title: `${plural(list.length, "forged signature")} in ${file}`,
      files: [file],
      evidence: list.map((f) => `${f.line ? `L${f.line} ` : ""}${f.reason}`),
      size: { files: 1, lines: list.length },
    });
  }
  return items;
}

function rawItems(result) {
  return result.raw
    .map(({ file, raw }) => ({
      id: `raw-${slug(file)}`,
      section: "raw-elements",
      kind: "raw-element",
      title: `${plural(raw.length, "raw interactive element")} in ${file}`,
      files: [file],
      evidence: raw.map((r) => `L${r.line} <${[r.tag, ...r.handlers].join(" ")}>`),
      size: { files: 1, lines: raw.length },
    }))
    .sort((a, b) => a.files[0].localeCompare(b.files[0]));
}

function requestItems(repo, doorsConfig, cleanupConfig, result) {
  const logPath = doorsConfig.requestLog;
  const log = readRequestLog(repo, logPath);
  if (!log.length) return { items: [], note: `no e2e request log at ${logPath ?? "(doors/config.json has no requestLog)"}; run e2e with the doorRequests fixture to fill this section` };
  const ignore = cleanupConfig.requests.ignore.map(globRe);
  const groups = new Map();
  for (const r of log) {
    if (r.door || ignore.some((re) => re.test(r.path))) continue;
    const key = `${r.method} ${r.path}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const endpointFlags = result.flags.filter((f) => f.kind === "endpoint");
  const items = [...groups].map(([key, rs]) => {
    const [method, route] = [rs[0].method, rs[0].path];
    const specs = [...new Set(rs.map((r) => r.spec))].sort();
    const count = rs.reduce((n, r) => n + r.count, 0);
    const messages = endpointFlags
      .map((flag) => ({ ...flag, findings: flag.findings.filter((f) => f.text === key) }))
      .filter((flag) => flag.findings.length)
      .map(discoveryMessage);
    return {
      id: `req-${method.toLowerCase()}-${slug(route.replace(/^\//, ""))}`,
      section: "unsigned-requests",
      kind: "unsigned-request",
      title: `${key} sent unsigned ${plural(count, "time")} from ${plural(rs.length, "test")}`,
      files: specs,
      evidence: [...rs.map((r) => `${r.spec}: "${r.test}" x${r.count}`).sort(), ...messages],
      size: { files: specs.length, lines: count },
    };
  });
  return { items: items.sort((a, b) => a.id.localeCompare(b.id)) };
}

function seedItems(repo, cleanupConfig) {
  const file = path.join(repo, cleanupConfig.seeds);
  if (!fs.existsSync(file)) return { items: [], note: `no seed file at ${cleanupConfig.seeds}` };
  const seeds = JSON.parse(fs.readFileSync(file, "utf8")).seeds ?? [];
  return {
    items: seeds.map((s) => ({
      id: `seed-${s.id}`,
      section: "seeds",
      kind: "seed",
      title: s.title,
      files: s.files ?? [],
      evidence: s.evidence ?? [],
      ...(s.fix ? { fix: s.fix } : {}),
      ...(s.decision ? { decision: s.decision } : {}),
      size: s.size ?? { files: (s.files ?? []).length, lines: 0 },
    })),
  };
}

function head(repo) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repo, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

/** Builds the report for the repo's working tree. Same tree, same report. */
export function buildReport(repo) {
  const { config: doorsConfig } = loadDoors(repo);
  const cleanupConfig = loadCleanupConfig(repo, doorsConfig);
  const result = checkFlags(repo);
  const errors = [...result.errors, ...result.parseErrors.map((p) => `could not parse ${p.file}: ${p.error}`)];
  const dupConfig = cleanupConfig.duplicates;
  let dups = [];
  try {
    dups = duplicateItems(runJscpd(repo, { ...dupConfig, ignore: [...dupConfig.ignore, ...doorsConfig.doorFolders.map((d) => `${d.path.replace(/\/$/, "")}/**`)] }));
  } catch (e) {
    errors.push(`duplicates: ${e.message}`);
  }
  const requests = requestItems(repo, doorsConfig, cleanupConfig, result);
  const seeds = seedItems(repo, cleanupConfig);
  const parts = {
    duplicates: { items: dups },
    flags: { items: flagItems(result) },
    "raw-elements": { items: rawItems(result) },
    "unsigned-requests": requests,
    seeds,
  };
  const sections = {};
  for (const [key, title] of Object.entries(SECTIONS)) {
    sections[key] = { title, count: parts[key].items.length, ...(parts[key].note ? { note: parts[key].note } : {}) };
  }
  const flagCounts = result.flags
    .map((f) => ({ flag: f.id, findings: f.findings.length }))
    .filter((f) => f.findings > 0)
    .sort((a, b) => b.findings - a.findings || a.flag.localeCompare(b.flag));
  return { version: 1, head: head(repo), sections, flagCounts, errors, items: Object.values(parts).flatMap((p) => p.items) };
}

function itemMarkdown(item) {
  const out = [`### ${item.id}`, "", `${item.title}`, "", `size: ${plural(item.size.files, "file")}, ${plural(item.size.lines, "line")}`, ""];
  const evidence = item.evidence.filter((e) => !e.includes("\n"));
  const messages = item.evidence.filter((e) => e.includes("\n"));
  for (const e of evidence) out.push(`- ${e}`);
  if (evidence.length) out.push("");
  for (const m of messages) out.push("```", m, "```", "");
  if (item.fragment) out.push("```" + (item.format ?? ""), item.fragment, "```", "");
  if (item.fix) out.push(`fix: ${item.fix}`, "");
  if (item.decision) out.push(`waits on a decision: ${item.decision}`, "");
  return out.join("\n");
}

export function renderMarkdown(report) {
  const counts = Object.entries(report.sections).map(([k, s]) => `${k} ${s.count}`).join(", ");
  const out = ["# Cleanup report", "", `${report.head ?? "(no git head)"} · ${report.items.length} items: ${counts}`, ""];
  out.push("Flags that fired most: " + (report.flagCounts.length ? report.flagCounts.map((f) => `${f.flag} (${f.findings})`).join(", ") : "none"), "");
  if (report.errors.length) out.push("Errors:", ...report.errors.map((e) => `- ${e}`), "");
  for (const [key, section] of Object.entries(report.sections)) {
    out.push(`## ${section.title} (${section.count})`, "");
    if (section.note) out.push(section.note, "");
    let items = report.items.filter((i) => i.section === key);
    if (key === "duplicates") items = [...items].sort((a, b) => b.size.lines - a.size.lines || a.id.localeCompare(b.id));
    for (const item of items) out.push(itemMarkdown(item));
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n");
}

export function writeReport(report, out) {
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2) + "\n");
  fs.writeFileSync(path.join(out, "report.md"), renderMarkdown(report));
}

export function countsLine(report) {
  return `${report.items.length} items: ${Object.entries(report.sections).map(([k, s]) => `${k} ${s.count}`).join(", ")}`;
}

function main(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--repo") opts.repo = path.resolve(argv[++i]);
    else if (argv[i] === "--out") opts.out = path.resolve(argv[++i]);
    else if (argv[i] === "--help" || argv[i] === "-h") opts.help = true;
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  if (opts.help || !opts.out) {
    console.log(HELP);
    return opts.help ? 0 : 2;
  }
  const report = buildReport(opts.repo ?? process.cwd());
  writeReport(report, opts.out);
  console.log(`report: ${countsLine(report)} -> ${path.join(opts.out, "report.md")}`);
  for (const e of report.errors) console.log(`report: ${e}`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`cleanup report: ${e.message}\n`);
    process.exitCode = 2;
  }
}
