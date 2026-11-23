import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { makeEnv, mapEnv, tempDir } from "./helpers/env.mjs";
import { loadConfig } from "../lib/config.mjs";
import { toJson } from "../lib/graph.mjs";
import { buildBaselines, writeSnapshot, loadSnapshots } from "../lib/baselines.mjs";
import { diffGraphs } from "../lib/diff.mjs";

const hook = (file) => ({ type: "command", command: `node "$CLAUDE_PROJECT_DIR/${file}"` });
const meta = (takes) => `export const meta = { why: "w", layer: "check", takes: ["${takes}"] };\n`;

function twoCommitEnv() {
  return makeEnv({
    commits: [
      {
        date: "2026-03-01T00:00:00Z",
        files: {
          "scripts/a.mjs": meta("job-x"),
          ".githooks/pre-commit": "#!/bin/sh\nexec node scripts/a.mjs\n",
          ".claude/settings.json": JSON.stringify({ hooks: { Stop: [{ hooks: [hook("scripts/a.mjs")] }] } }),
        },
      },
      {
        date: "2026-03-20T00:00:00Z",
        files: {
          "scripts/a.mjs": meta("job-y"),
          "scripts/b.mjs": meta("job-x"),
          ".claude/settings.json": JSON.stringify({ hooks: { Stop: [{ hooks: [hook("scripts/a.mjs"), hook("scripts/b.mjs")] }] } }),
        },
      },
    ],
  });
}

test("a git-ref baseline holds the repo as it stood at that ref", () => {
  const env = twoCommitEnv();
  const config = loadConfig();
  const current = mapEnv(env, config);
  const [base] = buildBaselines({ ...env, config, current, refs: ["HEAD~1"], daysBack: [], snapshots: [] });
  assert.match(base.label, /^HEAD~1 \([0-9a-f]{7} 2026-03-01\)$/);
  const diff = diffGraphs(current, base);
  assert.deepEqual(diff.added, ["hook:repo:.claude/settings.json:Stop:0.1", "script:repo:scripts/b.mjs"]);
  assert.deepEqual(diff.removed, []);
  assert.deepEqual(diff.moved, [{ takes: "job-x", from: ["script:repo:scripts/a.mjs"], to: ["script:repo:scripts/b.mjs"] }]);
});

test("days-back baselines resolve against the HEAD commit date, so they are the same on every run", () => {
  const env = twoCommitEnv();
  const config = loadConfig();
  const current = mapEnv(env, config);
  const make = () => buildBaselines({ ...env, config, current, refs: [], daysBack: [7, 30], snapshots: [] });
  const first = make();
  assert.deepEqual(first.map((b) => b.label.replace(/[0-9a-f]{7}/, "sha")), ["7 days before HEAD (sha 2026-03-01)"]);
  assert.equal(JSON.stringify(first), JSON.stringify(make()));
});

test("snapshots are one file per day, and ones identical to the current graph are not offered", () => {
  const env = twoCommitEnv();
  const config = loadConfig();
  const current = mapEnv(env, config);
  const out = tempDir();
  const old = { ...current, boxes: current.boxes.filter((b) => !b.id.includes("b.mjs")) };
  writeSnapshot(out, toJson(old), "2026-03-02");
  writeSnapshot(out, toJson(current), "2026-03-21");
  writeSnapshot(out, toJson(current), "2026-03-21");
  assert.deepEqual(fs.readdirSync(path.join(out, "snapshots")), ["2026-03-02.json", "2026-03-21.json"]);
  const baselines = buildBaselines({ ...env, config, current, refs: [], daysBack: [], snapshots: loadSnapshots(out) });
  assert.deepEqual(baselines.map((b) => b.label), ["snapshot 2026-03-02"]);
  assert.deepEqual(diffGraphs(current, baselines[0]).added, ["script:repo:scripts/b.mjs"]);
});
