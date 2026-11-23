import { test } from "node:test";
import assert from "node:assert/strict";
import { makeEnv, mapEnv } from "./helpers/env.mjs";
import { toJson } from "../lib/graph.mjs";

const checkHook = { type: "command", command: 'f="$CLAUDE_PROJECT_DIR/scripts/check.mjs"; [ -f "$f" ] || exit 0; node "$f" --hook' };

function env() {
  return makeEnv({
    repo: {
      "scripts/check.mjs": 'const RULES = [{ id: "no-env-files", run: () => [] }];\n',
      ".githooks/pre-commit": "#!/bin/sh\nexec node scripts/check.mjs --rules --staged\n",
      ".claude/settings.json": { hooks: { Stop: [{ hooks: [checkHook] }], SubagentStop: [{ hooks: [checkHook] }] } },
      "CLAUDE.md": "| Rule | Enforced by |\n|---|---|\n| No env files | `scripts/check.mjs` rule `no-env-files` |\n",
    },
  });
}

test("blast radius: a script reached from Stop, SubagentStop and pre-commit takes its rules and their rows with it", () => {
  const graph = mapEnv(env());
  const check = graph.boxes.find((b) => b.id === "script:repo:scripts/check.mjs");
  assert.deepEqual(check.reach, ["event:Stop", "event:SubagentStop", "event:git:pre-commit"]);
  assert.deepEqual(check.blast, ["row:repo:CLAUDE.md#1", "rule:repo:scripts/check.mjs#no-env-files"]);
});

test("graph.json is the same bytes on every run over the same environment", () => {
  const e = env();
  assert.equal(toJson(mapEnv(e)), toJson(mapEnv(e)));
});

test("a hook calling a missing script draws the script as a red box with the error", () => {
  const graph = mapEnv(makeEnv({ repo: { ".claude/settings.json": { hooks: { Stop: [{ hooks: [checkHook] }] } } } }));
  const check = graph.boxes.find((b) => b.id === "script:repo:scripts/check.mjs");
  assert.match(check.error, /not found/);
});
