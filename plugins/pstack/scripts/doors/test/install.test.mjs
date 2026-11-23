import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DOORS_DIR } from "./helpers.mjs";

function repo(pkg = { devDependencies: { vitest: "^4", "@playwright/test": "1.60.0" } }) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pstack-install-"));
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(pkg));
  return dir;
}

const install = (dir, ...args) => spawnSync(process.execPath, [path.join(DOORS_DIR, "install.mjs"), "--repo", dir, ...args], { encoding: "utf8" });
const read = (dir, f) => fs.readFileSync(path.join(dir, f), "utf8");

test("scaffolds the helper, its test, the e2e recorder, an empty flag file and both configs", () => {
  const dir = repo();
  const r = install(dir, "--door-folder", "src/components/ui");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(read(dir, "src/lib/doors.ts"), read(DOORS_DIR, "templates/doors.ts"));
  assert.equal(read(dir, "src/lib/doors.test.ts"), read(DOORS_DIR, "templates/doors.test.ts"));
  assert.equal(read(dir, "e2e/doorRequests.ts"), read(DOORS_DIR, "templates/doorRequests.ts"));
  assert.deepEqual(JSON.parse(read(dir, "doors/flags.json")), { flags: [] });
  const config = JSON.parse(read(dir, "doors/config.json"));
  assert.equal(config.helper, "src/lib/doors.ts");
  assert.deepEqual(config.doorFolders, [{ path: "src/components/ui", why: "" }]);
  assert.equal(config.requestLog, "test-results/door-requests");
  assert.deepEqual(JSON.parse(read(dir, "cleanup/seeds.json")), { seeds: [] });
  assert.equal(JSON.parse(read(dir, "cleanup/config.json")).seeds, "cleanup/seeds.json");
  assert.match(r.stdout, /next:/);
});

test("leaves the test and the e2e recorder out when the repo has no vitest or playwright", () => {
  const dir = repo({});
  assert.equal(install(dir).status, 0);
  assert.ok(fs.existsSync(path.join(dir, "src/lib/doors.ts")));
  assert.ok(!fs.existsSync(path.join(dir, "src/lib/doors.test.ts")));
  assert.ok(!fs.existsSync(path.join(dir, "e2e/doorRequests.ts")));
});

test("keeps files that exist unless --force, and names them", () => {
  const dir = repo();
  fs.mkdirSync(path.join(dir, "doors"));
  fs.writeFileSync(path.join(dir, "doors/flags.json"), '{ "flags": [1] }');
  const r = install(dir);
  assert.equal(r.status, 0);
  assert.equal(read(dir, "doors/flags.json"), '{ "flags": [1] }');
  assert.match(r.stdout, /kept doors\/flags\.json/);
  assert.equal(install(dir, "--force").status, 0);
  assert.deepEqual(JSON.parse(read(dir, "doors/flags.json")), { flags: [] });
});

test("--helper and --fixture move the scaffolded files and the config follows", () => {
  const dir = repo();
  assert.equal(install(dir, "--helper", "app/lib/sign.ts", "--fixture", "tests/e2e/doorRequests.ts").status, 0);
  assert.ok(fs.existsSync(path.join(dir, "app/lib/sign.ts")));
  assert.ok(fs.existsSync(path.join(dir, "app/lib/sign.test.ts")));
  assert.match(read(dir, "app/lib/sign.test.ts"), /from "\.\/sign"/);
  assert.ok(fs.existsSync(path.join(dir, "tests/e2e/doorRequests.ts")));
  assert.equal(JSON.parse(read(dir, "doors/config.json")).helper, "app/lib/sign.ts");
});
