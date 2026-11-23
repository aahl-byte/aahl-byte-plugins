import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { fakeCtx, readLedger, tmpFile } from "./helpers.mjs";
import { defineTool } from "../lib/tool.mjs";
import { callTool } from "../lib/call.mjs";
import { ledgerPath } from "../lib/ledger.mjs";

const meta = { why: "Echoes for the ledger test.", layer: "type", takes: ["typed-tools"] };
const echo = defineTool({
  name: "Echo",
  description: "echo",
  input: { word: z.string() },
  meta,
  command: ({ word }) => ({ program: process.execPath, args: ["-e", "process.stdout.write(process.argv[1])", word] }),
});
const fail = defineTool({
  name: "Fail",
  description: "exits 3",
  input: {},
  meta,
  command: () => ({ program: process.execPath, args: ["-e", "process.stderr.write('nope'); process.exit(3)"] }),
});

test("each call appends one JSON line: tool, args, exit status, duration", async () => {
  const ledger = tmpFile("ledger.jsonl");
  const ctx = fakeCtx({ cwd: process.cwd(), ledger });
  const result = await callTool(echo, { word: "hi" }, ctx);
  assert.match(result.text, /hi/);
  const lines = readLedger(ledger);
  assert.equal(lines.length, 1);
  const [line] = lines;
  assert.equal(line.tool, "Echo");
  assert.equal(line.server, "test");
  assert.deepEqual(line.args, { word: "hi" });
  assert.equal(line.exit, 0);
  assert.equal(typeof line.ms, "number");
  assert.equal(line.cwd, process.cwd());
  assert.match(line.ts, /^\d{4}-\d\d-\d\dT/);
});

test("a failing command records its exit status and comes back as an error", async () => {
  const ledger = tmpFile("ledger.jsonl");
  const result = await callTool(fail, {}, fakeCtx({ cwd: process.cwd(), ledger }));
  assert.equal(result.isError, true);
  assert.match(result.text, /nope/);
  assert.equal(readLedger(ledger)[0].exit, 3);
});

test("input the schema refuses is recorded too, with the reason, and nothing runs", async () => {
  const ledger = tmpFile("ledger.jsonl");
  const result = await callTool(echo, { word: 5 }, fakeCtx({ cwd: process.cwd(), ledger }));
  assert.equal(result.isError, true);
  const [line] = readLedger(ledger);
  assert.equal(line.exit, null);
  assert.match(line.error, /word/);
});

test("long argument strings are shortened in the ledger", async () => {
  const ledger = tmpFile("ledger.jsonl");
  await callTool(echo, { word: "x".repeat(2000) }, fakeCtx({ cwd: process.cwd(), ledger }));
  assert.ok(readLedger(ledger)[0].args.word.length < 600);
});

test("the ledger lives at AGENT_TOOLS_LEDGER when set, else under the XDG state dir", () => {
  assert.equal(ledgerPath({ AGENT_TOOLS_LEDGER: "/x/l.jsonl" }), "/x/l.jsonl");
  assert.equal(ledgerPath({ XDG_STATE_HOME: "/s", HOME: "/h" }), "/s/agent-tools/ledger.jsonl");
  assert.equal(ledgerPath({ HOME: "/h" }), "/h/.local/state/agent-tools/ledger.jsonl");
});
