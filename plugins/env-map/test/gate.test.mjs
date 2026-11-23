import { test } from "node:test";
import assert from "node:assert/strict";
import { makeEnv, mapEnv } from "./helpers/env.mjs";
import { runGate, parseResponsibilities } from "../lib/gate.mjs";

const jobs = parseResponsibilities("# jobs\nrepo-rules: Repo rules run on every change.\nworktrees: Worktrees live in one place.\n");
const hook = { type: "command", command: 'node "$CLAUDE_PROJECT_DIR/scripts/a.mjs"' };
const settings = { hooks: { Stop: [{ hooks: [hook] }] } };
const complete = 'export const meta = { why: "Runs the rules.", layer: "check", takes: ["repo-rules"] };\n';

test("responsibilities.yaml is one id per line with its description", () => {
  assert.deepEqual([...jobs.keys()], ["repo-rules", "worktrees"]);
});

test("a script we own with no why fails the gate, naming the file and the field", () => {
  const graph = mapEnv(makeEnv({ repo: { ".claude/settings.json": settings, "scripts/a.mjs": 'export const meta = { layer: "check", takes: ["repo-rules"] };\n' } }));
  const result = runGate(graph, { responsibilities: jobs });
  assert.equal(result.ok, false);
  assert.deepEqual(
    result.failures.map((f) => [f.file, f.field]),
    [["scripts/a.mjs", "why"]]
  );
  assert.match(result.failures[0].message, /scripts\/a\.mjs: a\.mjs has no why; add it to export const meta/);
  assert.deepEqual(result.missingWhy, { ours: 1, external: 0 });
});

test("the same script with why, layer and takes passes", () => {
  const graph = mapEnv(makeEnv({ repo: { ".claude/settings.json": settings, "scripts/a.mjs": complete } }));
  const result = runGate(graph, { responsibilities: jobs });
  assert.deepEqual(result.failures, []);
  assert.equal(result.ok, true);
});

test("an inline hook command fails", () => {
  const inline = { hooks: { Stop: [{ hooks: [hook, { type: "command", command: "echo done" }] }] } };
  const result = runGate(mapEnv(makeEnv({ repo: { ".claude/settings.json": inline, "scripts/a.mjs": complete } })), { responsibilities: jobs });
  assert.deepEqual(
    result.failures.map((f) => [f.file, f.field]),
    [[".claude/settings.json", "command"]]
  );
});

test("a layer outside the list fails", () => {
  const script = 'export const meta = { why: "w", layer: "vibes", takes: ["repo-rules"] };\n';
  const result = runGate(mapEnv(makeEnv({ repo: { ".claude/settings.json": settings, "scripts/a.mjs": script } })), { responsibilities: jobs });
  assert.deepEqual(result.failures.map((f) => f.field), ["layer"]);
  assert.match(result.failures[0].message, /layer "vibes" is not one of design \| type \| check \| test \| verify \| prose/);
});

test("a takes id missing from responsibilities.yaml fails", () => {
  const script = 'export const meta = { why: "w", layer: "check", takes: ["mystery"] };\n';
  const result = runGate(mapEnv(makeEnv({ repo: { ".claude/settings.json": settings, "scripts/a.mjs": script } })), { responsibilities: jobs });
  assert.deepEqual(result.failures.map((f) => f.field), ["takes"]);
  assert.match(result.failures[0].message, /takes "mystery" is not in responsibilities\.yaml/);
});

test("external parts missing why are counted but never fail", () => {
  const graph = mapEnv(
    makeEnv({
      repo: { ".claude/settings.json": settings, "scripts/a.mjs": complete },
      home: { ".claude/skills/ext/SKILL.md": "---\nname: ext\ndescription: d\n---\n", ".claude/hooks/x.py": "" },
    })
  );
  const result = runGate(graph, { responsibilities: jobs });
  assert.equal(result.ok, true);
  assert.deepEqual(result.missingWhy, { ours: 0, external: 2 });
});
