import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { runProgram, sessionCommand, sessionResult } from "../lib/sessions.mjs";
import { tmpDir } from "./helpers.mjs";

const AGENT_TOOLS = path.resolve(import.meta.dirname, "../../../../agent-tools");

test("a role session runs through agent-tools with the role, model and effort, and the prompt goes on stdin", () => {
  const { program, args } = sessionCommand({ role: "cleanup", cwd: "/wt", model: "opus", effort: "high", schema: { type: "object" }, addDirs: ["/round"] });
  assert.equal(program, process.execPath);
  assert.deepEqual(args, [
    path.join(AGENT_TOOLS, "bin/agent-tools.mjs"),
    "run",
    "--role",
    "cleanup",
    "--cwd",
    "/wt",
    "--model",
    "opus",
    "--effort",
    "high",
    "--",
    "--output-format",
    "stream-json",
    "--verbose",
    "--json-schema",
    '{"type":"object"}',
    "--add-dir",
    "/round",
  ]);
});

test("a session with no role gets only its listed built-in tools, no MCP servers and no shell", () => {
  const { program, args } = sessionCommand({ tools: ["Read", "Grep", "Glob"], cwd: "/wt", model: "opus", effort: "high" });
  assert.equal(program, "claude");
  assert.deepEqual(args.slice(0, 13), ["-p", "--tools", "Read,Grep,Glob", "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}', "--allowedTools", "Read,Grep,Glob", "--permission-mode", "dontAsk", "--model", "opus", "--effort"]);
  assert.ok(!args.join(" ").includes("Bash"));
});

test("the session's result comes from the last result event of its stream-json log", () => {
  const log = path.join(tmpDir(), "s.jsonl");
  fs.writeFileSync(
    log,
    [
      JSON.stringify({ type: "system", subtype: "init" }),
      JSON.stringify({ type: "result", subtype: "success", is_error: false, total_cost_usd: 1.5, duration_ms: 90000, num_turns: 12, session_id: "abc", structured_output: { verdict: "PASS" } }),
      "",
    ].join("\n")
  );
  assert.deepEqual(sessionResult(log), { structured: { verdict: "PASS" }, result: null, costUsd: 1.5, durationMs: 90000, turns: 12, sessionId: "abc", isError: false, subtype: "success" });
  assert.equal(sessionResult(path.join(tmpDir(), "missing.jsonl")).subtype, "no-result");
});

test("a program past its timeout is killed by its process group id and reported", async () => {
  const r = await runProgram(process.execPath, ["-e", "setTimeout(() => {}, 60000)"], { timeoutMs: 200 });
  assert.equal(r.timedOut, true);
  assert.notEqual(r.exit, 0);
});
