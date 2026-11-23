import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { buildReport } from "../report.mjs";
import { CLEANUP_DIR, fixtureRepo, tmpDir } from "./helpers.mjs";

const repo = fixtureRepo();
const report = buildReport(repo);
const items = (section) => report.items.filter((i) => i.section === section);

test("every item has an id, kind, title, files, evidence and size, and ids are unique", () => {
  for (const item of report.items) {
    for (const key of ["id", "kind", "title", "files", "evidence", "size"]) assert.ok(item[key] !== undefined, `${item.id} has ${key}`);
    assert.ok(Array.isArray(item.files) && Array.isArray(item.evidence), item.id);
    assert.equal(typeof item.size.files, "number", item.id);
    assert.equal(typeof item.size.lines, "number", item.id);
  }
  assert.equal(new Set(report.items.map((i) => i.id)).size, report.items.length);
});

test("the sections count their items", () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(report.sections).map(([k, s]) => [k, s.count])),
    { duplicates: 2, flags: 1, "raw-elements": 1, "unsigned-requests": 2, seeds: 2 }
  );
});

test("duplicates: renamed copies are found, overlapping clones fold into one item, door folders and tests are left out, scss is in", () => {
  const dups = items("duplicates");
  assert.deepEqual(dups.map((d) => d.files), [
    ["src/routes/findings.ts", "src/routes/inspections.ts"],
    ["src/styles/denied.module.scss", "src/styles/missing.module.scss"],
  ]);
  assert.deepEqual(dups[0].evidence.slice(0, 2), ["src/routes/findings.ts:1-12", "src/routes/inspections.ts:1-12"]);
  assert.match(dups[0].id, /^dup-[0-9a-f]{8}$/);
  assert.equal(dups[0].kind, "duplicate");
  assert.deepEqual(dups[0].size, { files: 2, lines: 24 });
  assert.match(dups[0].fragment, /Number\.isFinite/);
});

test("flags: one item per flag and file, carrying the discovery message", () => {
  const [item] = items("flags");
  assert.equal(item.id, "flag-raw-select-components-screen");
  assert.equal(item.kind, "flag");
  assert.deepEqual(item.files, ["src/components/Screen.tsx"]);
  assert.match(item.evidence[0], /^✗ <select> at src\/components\/Screen\.tsx:8 isn't signed\./);
  assert.deepEqual(report.flagCounts, [{ flag: "post-findings", findings: 2 }, { flag: "raw-select", findings: 1 }]);
});

test("raw elements: lowercase interactive JSX and on* handlers outside door folders, one item per file", () => {
  const [item] = items("raw-elements");
  assert.equal(item.id, "raw-components-screen");
  assert.deepEqual(item.evidence, ["L3 <div onClick>", "L4 <button onClick>", "L7 <input>", "L8 <select>", "L9 <a>"]);
  assert.deepEqual(item.size, { files: 1, lines: 5 });
});

test("unsigned requests: one item per endpoint from the e2e log, ignored paths and signed requests left out", () => {
  const reqs = items("unsigned-requests");
  assert.deepEqual(reqs.map((r) => r.id), ["req-patch-api-inspections-id", "req-post-api-findings"]);
  const post = reqs[1];
  assert.deepEqual(post.files, ["e2e/quick-add.spec.ts", "e2e/review.spec.ts"]);
  assert.equal(post.size.lines, 3);
  assert.ok(post.evidence.some((e) => /^✗ POST \/api\/findings from e2e\/quick-add\.spec\.ts/.test(e)), "a flagged endpoint carries its discovery message");
});

test("seeds come from the repo's seed file, with their fix and any decision they wait on", () => {
  const seeds = items("seeds");
  assert.deepEqual(seeds.map((s) => s.id), ["seed-alert-dialog-unstyled", "seed-logging"]);
  assert.equal(seeds[0].fix, "Give the alert-dialog door an unstyled option and move the dialogs onto it.");
  assert.deepEqual(seeds[0].size, { files: 4, lines: 40 });
  assert.equal(seeds[1].decision, "Adopt a logger, or keep console?");
  assert.deepEqual(seeds[1].size, { files: 0, lines: 0 });
});

test("the same tree gives the same report", () => {
  assert.deepEqual(buildReport(repo), report);
});

test("with no request log the section is empty and says why", () => {
  const bare = fixtureRepo((dir) => fs.rmSync(path.join(dir, "requests"), { recursive: true }));
  const r = buildReport(bare);
  assert.equal(r.sections["unsigned-requests"].count, 0);
  assert.match(r.sections["unsigned-requests"].note, /no e2e request log/);
});

test("the CLI writes report.json and report.md and prints the counts", () => {
  const out = tmpDir();
  const r = spawnSync(process.execPath, [path.join(CLEANUP_DIR, "report.mjs"), "--repo", repo, "--out", out], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /8 items: duplicates 2, flags 1, raw-elements 1, unsigned-requests 2, seeds 2/);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out, "report.json"), "utf8")), report);
  const md = fs.readFileSync(path.join(out, "report.md"), "utf8");
  for (const heading of ["## Duplicates (2)", "## Flag findings (1)", "## Raw interactive elements (1)", "## Unsigned requests (2)", "## Seeds (2)"]) assert.ok(md.includes(heading), heading);
  assert.ok(md.includes("### raw-components-screen"));
});
