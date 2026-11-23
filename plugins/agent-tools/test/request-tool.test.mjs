import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeCtx, readLedger, tmpFile } from "./helpers.mjs";
import { loadServer } from "../lib/server.mjs";
import { callTool } from "../lib/call.mjs";

test("RequestTool writes one ledger line with why and what, and returns recorded", async () => {
  const [tool] = await loadServer("request");
  assert.equal(tool.name, "RequestTool");
  const ledger = tmpFile("ledger.jsonl");
  const result = await callTool(tool, { why: "need to restart the dev server", what: "Serve({ port })" }, fakeCtx({ ledger }));
  assert.equal(result.text, "recorded");
  assert.equal(result.isError, false);
  const lines = readLedger(ledger);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].tool, "RequestTool");
  assert.deepEqual(lines[0].args, { why: "need to restart the dev server", what: "Serve({ port })" });
  assert.equal(lines[0].exit, 0);
});

test("RequestTool runs no program", async () => {
  const [tool] = await loadServer("request");
  assert.equal(tool.command, undefined);
  assert.equal(typeof tool.handle, "function");
});

test("RequestTool needs both why and what", async () => {
  const [tool] = await loadServer("request");
  const result = await callTool(tool, { what: "x" }, fakeCtx());
  assert.equal(result.isError, true);
});
