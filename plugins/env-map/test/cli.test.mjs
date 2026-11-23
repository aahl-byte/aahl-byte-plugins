import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { goldenEnv, makeEnv } from "./helpers/env.mjs";
import { GENERATED_LINE } from "../lib/render.mjs";

const BIN = new URL("../bin/env-map.mjs", import.meta.url).pathname;

function run(env, ...args) {
  return spawnSync("node", [BIN, ...args, "--root", env.root, "--home", env.home, "--config-dir", env.configDirs[0]], { encoding: "utf8" });
}

test("map twice gives byte-identical graph.json and HTML that differs only on the generated line", () => {
  const env = goldenEnv();
  const out = path.join(env.root, ".claude/env-map");
  const first = run(env, "map");
  assert.equal(first.status, 0, first.stderr);
  const graph1 = fs.readFileSync(path.join(out, "graph.json"));
  const html1 = fs.readFileSync(path.join(out, "index.html"), "utf8");
  const second = run(env, "map");
  assert.equal(second.status, 0, second.stderr);
  assert.ok(graph1.equals(fs.readFileSync(path.join(out, "graph.json"))), "graph.json bytes differ");
  const a = html1.split("\n");
  const b = fs.readFileSync(path.join(out, "index.html"), "utf8").split("\n");
  const differing = a.filter((line, i) => line !== b[i]);
  assert.equal(a.length, b.length);
  assert.ok(differing.every((l) => GENERATED_LINE.test(l)), `unexpected differences: ${differing.join("\n").slice(0, 300)}`);
  assert.equal(fs.readFileSync(path.join(out, ".gitignore"), "utf8"), "*\n");
  assert.equal(fs.readdirSync(path.join(out, "snapshots")).length, 1);
});

test("check fails on the golden fixture, naming each file and field, and counts missing whys", () => {
  const r = run(goldenEnv(), "check");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^FAIL \.claude\/settings\.json: Stop hook "echo stopped" is inline/m);
  assert.match(r.stdout, /^FAIL scripts\/guard\.mjs: guard\.mjs has no why; add it to export const meta$/m);
  assert.match(r.stdout, /^parts missing why: \d+ ours, \d+ external$/m);
});

test("check passes when every part we own is explained", () => {
  const env = makeEnv({
    repo: {
      ".claude/settings.json": { hooks: { Stop: [{ hooks: [{ type: "command", command: 'node "$CLAUDE_PROJECT_DIR/scripts/a.mjs"' }] }] } },
      "scripts/a.mjs": 'export const meta = { why: "Draws the map.", layer: "verify", takes: ["environment-map"] };\n',
    },
  });
  const r = run(env, "check");
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /env-map check: pass/);
});
