import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { PLUGIN_ROOT, readLedger, tmpDir, tmpFile } from "./helpers.mjs";

async function connect(args, env) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(PLUGIN_ROOT, "bin/server.mjs"), ...args],
    env: { ...process.env, ...env },
    stderr: "pipe",
  });
  const client = new Client({ name: "test", version: "0" });
  await client.connect(transport);
  return client;
}

test("the request server lists RequestTool over stdio, and a call lands in the ledger", async () => {
  const ledger = tmpFile("ledger.jsonl");
  const client = await connect(["request"], { AGENT_TOOLS_LEDGER: ledger, AGENT_TOOLS_ROLE: "dev" });
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name), ["RequestTool"]);
    const res = await client.callTool({ name: "RequestTool", arguments: { why: "w", what: "x" } });
    assert.deepEqual(res.content, [{ type: "text", text: "recorded" }]);
    const [line] = readLedger(ledger);
    assert.equal(line.server, "request");
    assert.equal(line.role, "dev");
  } finally {
    await client.close();
  }
});

test("--only registers just the named tools", async () => {
  const repo = tmpDir();
  execFileSync("git", ["init", "-q", "-b", "main", repo]);
  fs.writeFileSync(path.join(repo, "a.txt"), "a\n");
  const client = await connect(["dev", "--cwd", repo, "--only", "Git_Status"], { AGENT_TOOLS_LEDGER: tmpFile("l.jsonl") });
  try {
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name), ["Git_Status"]);
    const res = await client.callTool({ name: "Git_Status", arguments: {} });
    assert.match(res.content[0].text, /\?\? a\.txt/);
  } finally {
    await client.close();
  }
});

test("--only naming an unknown tool fails at start", () => {
  assert.throws(() => execFileSync(process.execPath, [path.join(PLUGIN_ROOT, "bin/server.mjs"), "dev", "--only", "Deploy"], { stdio: "pipe", input: "" }), /dev has no tool Deploy/);
});
