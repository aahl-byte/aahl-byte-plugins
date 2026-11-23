// Duplicate code from jscpd with renamed identifiers matched, folded into families: copies that overlap become one item.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const OWN_DIR = path.resolve(import.meta.dirname, "..");
const JSCPD = path.join(OWN_DIR, "node_modules", ".bin", "jscpd");

/** jscpd is pinned in this package and installed from its lockfile on first use. */
export function ensureJscpd() {
  if (fs.existsSync(JSCPD)) return JSCPD;
  const r = spawnSync("npm", ["ci", "--omit=dev", "--no-audit", "--no-fund", "--loglevel=error"], { cwd: OWN_DIR, stdio: ["ignore", "ignore", "inherit"] });
  if (r.status !== 0 || !fs.existsSync(JSCPD)) throw new Error(`npm ci failed in ${OWN_DIR}; jscpd is not installed`);
  return JSCPD;
}

/** Every clone pair jscpd finds, with repo-relative paths. Never runs --semantic, which needs a model. */
export function runJscpd(repo, { paths, formats, ignore, minTokens }) {
  const root = fs.realpathSync(repo);
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "pstack-jscpd-"));
  try {
    const args = [
      "--ignore-identifiers",
      "--format",
      formats.join(","),
      ...(ignore.length ? ["--ignore", ignore.join(",")] : []),
      "--min-tokens",
      String(minTokens),
      "--reporters",
      "json",
      "--output",
      out,
      "--absolute",
      "--silent",
      "--no-tips",
      ...paths,
    ];
    const r = spawnSync(ensureJscpd(), args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    const file = path.join(out, "jscpd-report.json");
    if (!fs.existsSync(file)) throw new Error(`jscpd wrote no report (exit ${r.status}): ${(r.stderr || r.stdout).trim().slice(0, 400)}`);
    const rel = (name) => path.relative(root, path.resolve(root, name));
    return JSON.parse(fs.readFileSync(file, "utf8")).duplicates.map((d) => ({
      kind: d.kind,
      format: d.format,
      lines: d.lines,
      tokens: d.tokens,
      fragment: d.fragment,
      a: { file: rel(d.firstFile.name), start: d.firstFile.start, end: d.firstFile.end },
      b: { file: rel(d.secondFile.name), start: d.secondFile.start, end: d.secondFile.end },
    }));
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
}

/** Groups clones into families: overlapping copies in one file are one region, and clones join regions. */
export function families(clones) {
  const byFile = new Map();
  const frags = clones.flatMap((c) => [c.a, c.b]);
  for (const f of frags) byFile.set(f.file, [...(byFile.get(f.file) ?? []), f]);
  const regions = [];
  const regionOf = new Map();
  for (const [file, list] of [...byFile].sort(([a], [b]) => a.localeCompare(b))) {
    let current = null;
    for (const f of [...list].sort((x, y) => x.start - y.start || x.end - y.end)) {
      if (current && f.start <= current.end) current.end = Math.max(current.end, f.end);
      else regions.push((current = { id: regions.length, file, start: f.start, end: f.end }));
      regionOf.set(f, current.id);
    }
  }
  const parent = regions.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (const c of clones) parent[find(regionOf.get(c.a))] = find(regionOf.get(c.b));
  const groups = new Map();
  for (const r of regions) groups.set(find(r.id), [...(groups.get(find(r.id)) ?? []), r]);
  const clonesOf = new Map();
  for (const c of clones) {
    const g = find(regionOf.get(c.a));
    clonesOf.set(g, [...(clonesOf.get(g) ?? []), c]);
  }
  return [...groups]
    .map(([g, rs]) => ({
      regions: rs.map(({ file, start, end }) => ({ file, start, end })).sort((x, y) => x.file.localeCompare(y.file) || x.start - y.start),
      clones: clonesOf.get(g) ?? [],
    }))
    .sort((x, y) => x.regions[0].file.localeCompare(y.regions[0].file) || x.regions[0].start - y.regions[0].start);
}

const names = (files) => {
  const base = files.map((f) => path.basename(f));
  return base.length <= 4 ? base.join(", ") : `${base.slice(0, 4).join(", ")} and ${base.length - 4} more`;
};

export function duplicateItems(clones) {
  return families(clones).map(({ regions, clones: cs }) => {
    const where = regions.map((r) => `${r.file}:${r.start}-${r.end}`);
    const files = [...new Set(regions.map((r) => r.file))];
    const largest = [...cs].sort((x, y) => y.lines - x.lines)[0];
    return {
      id: `dup-${createHash("sha1").update(where.join("|")).digest("hex").slice(0, 8)}`,
      section: "duplicates",
      kind: "duplicate",
      title: `${regions.length} similar blocks across ${files.length} ${files.length === 1 ? "file" : "files"}: ${names(files)}`,
      files,
      evidence: where,
      fragment: (largest?.fragment ?? "").split("\n").slice(0, 12).join("\n"),
      format: largest?.format ?? null,
      clones: cs.length,
      size: { files: files.length, lines: regions.reduce((n, r) => n + r.end - r.start + 1, 0) },
    };
  });
}
