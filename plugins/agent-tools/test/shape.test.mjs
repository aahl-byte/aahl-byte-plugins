import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { render, redact, vitestReport, playwrightReport, commandReport } from "../lib/shape.mjs";

const fixture = (name) => JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "fixtures", name), "utf8"));

test("render puts failures before other lines", () => {
  const text = render({ status: "Test: 1 failed", failures: ["a.ts:3 boom"], lines: ["1 passed"] });
  assert.equal(text, "Test: 1 failed\n\nfailures (1):\na.ts:3 boom\n\n1 passed");
});

test("render cuts to the line cap and says how much it cut", () => {
  const lines = Array.from({ length: 50 }, (_, i) => `line ${i}`);
  const text = render({ status: "ok", lines }, { maxLines: 10 });
  const out = text.split("\n");
  assert.equal(out.length, 11);
  assert.equal(out.at(-1), "[cut 42 more lines; narrow the request to see them]");
});

test("render keeps failures when the cap is reached by the other lines", () => {
  const text = render({ status: "x", failures: ["f1", "f2"], lines: Array(100).fill("noise") }, { maxLines: 8 });
  assert.match(text, /failures \(2\):\nf1\nf2/);
});

test("render cuts to the byte cap too", () => {
  const text = render({ status: "ok", lines: [Array(5000).fill("x").join("")] }, { maxBytes: 1000 });
  assert.ok(Buffer.byteLength(text) <= 1100);
  assert.match(text, /\[cut/);
});

test("render is deterministic for the same input", () => {
  const input = { status: "s", failures: ["b", "a"], lines: ["z"] };
  assert.equal(render(input), render(input));
});

test("redact hides connection strings, URL credentials and key=value secrets", () => {
  const text = redact(
    [
      "READ_DATABASE_URI=postgresql://svc:hunter2@db.internal:5432/app",
      "fetching https://bot:ghp_abc123@github.com/o/r",
      "password: hunter2",
      "Authorization: Bearer eyJhbGciOi.abc.def",
      "api_key=sk-ant-123456",
    ].join("\n")
  );
  assert.doesNotMatch(text, /hunter2|ghp_abc123|eyJhbGciOi|sk-ant-123456|db\.internal/);
  assert.match(text, /\[redacted connection string\]/);
});

test("vitestReport lists only failures, each with file:line, suite errors included", () => {
  const report = vitestReport(fixture("vitest.json"), "/repo");
  assert.equal(report.status, "Test: 1 failed, 1 passed, 1 file failed to load");
  assert.deepEqual(report.failures, [
    'src/lib/agentToolsBroken.test.ts: failed to load: Failed to resolve import "./doesNotExist" from "src/lib/agentToolsBroken.test.ts". Does the file exist?',
    "src/lib/agentToolsProbe.test.ts:10 agent-tools probe > fails on purpose\n  AssertionError: expected 'undefined' to be 'string' // Object.is equality",
  ]);
  assert.deepEqual(report.lines, []);
  assert.doesNotMatch(report.failures.join("\n"), /node_modules|chunk-artifact/);
});

test("playwrightReport lists unexpected and flaky tests with file:line and project", () => {
  const report = playwrightReport(fixture("playwright.json"), "/repo");
  assert.equal(report.status, "E2E: 1 failed, 1 flaky, 1 passed, 0 skipped");
  assert.deepEqual(report.failures, [
    "e2e/access.spec.ts:47 [phone] report buttons > Send moves status forward\n  Error: expect(locator).toHaveText(expected) failed\n  Locator: getByRole('status')\n  Expected: \"Sent\"\n  Received: \"Draft\"",
    "e2e/access.spec.ts:40 [tablet] report buttons > Send moves status forward (flaky: passed on retry)\n  Timeout 5000ms exceeded.",
  ]);
});

test("commandReport shows stderr first when the command fails, and only a status line when it passes", () => {
  const failed = commandReport("Check", { exit: 1, stdout: "running\n", stderr: "[tsc] failed:\nsrc/a.ts(3,1): error TS2304\n" });
  assert.equal(failed.status, "Check: failed (exit 1)");
  assert.deepEqual(failed.failures, ["[tsc] failed:", "src/a.ts(3,1): error TS2304"]);
  assert.deepEqual(failed.lines, ["running"]);
  const passed = commandReport("Check", { exit: 0, stdout: "check: pass\n", stderr: "" });
  assert.equal(passed.status, "Check: ok");
  assert.deepEqual(passed.failures, []);
});

test("commandReport lifts FAIL and error lines out of stdout when a failing command wrote no stderr", () => {
  const r = commandReport("EnvMap_Check", { exit: 1, stdout: "FAIL a.md: no why\n\nparts missing why: 1\nerror: b.md unreadable\n", stderr: "" });
  assert.deepEqual(r.failures, ["FAIL a.md: no why", "error: b.md unreadable"]);
  assert.deepEqual(r.lines, ["", "parts missing why: 1"]);
});

test("commandReport names a timeout", () => {
  const r = commandReport("E2E", { exit: null, signal: "SIGKILL", timedOut: true, stdout: "", stderr: "" });
  assert.equal(r.status, "E2E: timed out");
});
