import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { goldenEnv } from "./helpers/env.mjs";

const PLUGIN = new URL("..", import.meta.url).pathname;

test("hooks.json registers one SessionStart command that calls a file in the plugin", () => {
  const hooks = JSON.parse(fs.readFileSync(path.join(PLUGIN, "hooks/hooks.json"), "utf8")).hooks;
  assert.deepEqual(Object.keys(hooks), ["SessionStart"]);
  const [cmd] = hooks.SessionStart[0].hooks;
  assert.equal(cmd.command, 'node "${CLAUDE_PLUGIN_ROOT}/hooks/session-start.mjs"');
  assert.ok(fs.existsSync(path.join(PLUGIN, "hooks/session-start.mjs")));
});

test("the SessionStart hook exits 0 at once and the page appears in the background", async () => {
  const env = goldenEnv();
  const page = path.join(env.root, ".claude/env-map/index.html");
  const started = Date.now();
  const r = spawnSync("node", [path.join(PLUGIN, "hooks/session-start.mjs")], {
    input: "{}",
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: env.root, CLAUDE_PLUGIN_ROOT: PLUGIN, HOME: env.home, CLAUDE_CONFIG_DIR: "" },
  });
  const took = Date.now() - started;
  assert.equal(r.status, 0, r.stderr);
  assert.ok(took < 1000, `hook took ${took}ms`);
  for (let i = 0; i < 100 && !fs.existsSync(page); i++) await sleep(100);
  assert.ok(fs.existsSync(page), "index.html was not written");
});

test("the SessionStart hook does nothing and exits 0 without a project dir", () => {
  const r = spawnSync("node", [path.join(PLUGIN, "hooks/session-start.mjs")], {
    input: "{}",
    encoding: "utf8",
    env: { ...process.env, CLAUDE_PROJECT_DIR: "" },
  });
  assert.equal(r.status, 0);
});
