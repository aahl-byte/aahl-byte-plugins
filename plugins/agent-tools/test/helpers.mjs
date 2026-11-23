import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const PLUGIN_ROOT = path.resolve(import.meta.dirname, "..");
export const INJECTION = "; rm -rf /";
export const exampleConfig = JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, "examples/inspection-app.agent-tools.json"), "utf8"));

/** A ctx whose temp paths and helper commands are fixed, so built argv can be compared exactly. */
export function fakeCtx({ cwd = "/repo/.claude/worktrees/probe", config = exampleConfig, run, ledger, env = {} } = {}) {
  return {
    cwd,
    config,
    env,
    ledger: ledger ?? tmpFile("ledger.jsonl"),
    server: "test",
    tmp: (name) => `/tmp/T/${name}`,
    run: run ?? (async () => ({ exit: 0, stdout: "3530\n", stderr: "" })),
  };
}

export function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "agent-tools-test-"));
}

export function tmpFile(name) {
  return path.join(tmpDir(), name);
}

export function readLedger(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}
