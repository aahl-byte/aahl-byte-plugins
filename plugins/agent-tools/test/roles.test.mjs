import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PLUGIN_ROOT, tmpDir } from "./helpers.mjs";
import { loadRole, roleNames, resolveRole, claudeArgs } from "../lib/roles.mjs";

const CWD = "/repo/.claude/worktrees/probe";

function fakePlaywrightPlugin() {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, ".mcp.json"), JSON.stringify({ playwright: { command: "npx", args: ["@playwright/mcp@latest"] } }));
  return dir;
}

test("the presets are dev, ops and verify", () => {
  assert.deepEqual(roleNames(), ["dev", "ops", "verify"]);
});

test("dev resolves to file tools, Test, Check, git reads, todo reads and notes, RequestTool", async () => {
  const r = await resolveRole(loadRole("dev"), { cwd: CWD });
  assert.deepEqual(r.builtins, ["Read", "Edit", "Write", "Grep", "Glob"]);
  assert.deepEqual(r.allowedTools, [
    "Read",
    "Edit",
    "Write",
    "Grep",
    "Glob",
    "mcp__dev__Test",
    "mcp__dev__Check",
    "mcp__dev__Git_Status",
    "mcp__dev__Git_Diff",
    "mcp__todo__Todo_Get",
    "mcp__todo__Todo_List",
    "mcp__todo__Todo_Note",
    "mcp__todo__Todo_Log",
    "mcp__request__RequestTool",
  ]);
  assert.deepEqual(Object.keys(r.mcpServers), ["dev", "todo", "request"]);
  assert.deepEqual(r.mcpServers.dev.args, [path.join(PLUGIN_ROOT, "bin/server.mjs"), "dev", "--cwd", CWD, "--only", "Test,Check,Git_Status,Git_Diff"]);
  assert.equal(r.mcpServers.dev.command, process.execPath);
  assert.equal(r.mcpServers.dev.env.AGENT_TOOLS_ROLE, "dev");
});

test("verify gets dev's read tools, E2E and the official Playwright plugin's server, pointed at the worktree's port", async () => {
  const r = await resolveRole(loadRole("verify"), { cwd: CWD, port: "3530", playwrightPlugin: fakePlaywrightPlugin() });
  assert.deepEqual(r.builtins, ["Read", "Grep", "Glob"]);
  assert.deepEqual(r.allowedTools, [
    "Read",
    "Grep",
    "Glob",
    "mcp__dev__Test",
    "mcp__dev__Check",
    "mcp__dev__Git_Status",
    "mcp__dev__Git_Diff",
    "mcp__dev__E2E",
    "mcp__todo__Todo_Get",
    "mcp__todo__Todo_List",
    "mcp__request__RequestTool",
    "mcp__playwright",
  ]);
  assert.deepEqual(r.mcpServers.playwright, {
    type: "stdio",
    command: "npx",
    args: ["@playwright/mcp@latest", "--headless", "--isolated", "--allowed-origins", "http://localhost:3530"],
  });
  assert.match(r.appendSystemPrompt, /http:\/\/localhost:3530/);
});

test("ops gets todo writes, jira and wt-session, and no file writes", async () => {
  const r = await resolveRole(loadRole("ops"), { cwd: CWD });
  assert.deepEqual(r.builtins, ["Read", "Grep", "Glob"]);
  assert.deepEqual(Object.keys(r.mcpServers), ["todo", "jira", "wt-session", "request"]);
  for (const t of ["mcp__todo__Todo_Task", "mcp__todo__Todo_Status", "mcp__jira__Jira_Comment", "mcp__wt-session__Session_Ask"]) assert.ok(r.allowedTools.includes(t), t);
  assert.ok(!r.allowedTools.includes("Edit"));
});

test("no preset grants db-request", () => {
  for (const name of roleNames()) assert.ok(!("db-request" in loadRole(name).servers), name);
});

test("a role naming a tool its server lacks is refused", async () => {
  await assert.rejects(resolveRole({ name: "bad", builtins: [], servers: { dev: ["Deploy"] } }, { cwd: CWD }), /dev has no tool Deploy/);
});

test("claudeArgs builds the restricted headless command line", async () => {
  const r = await resolveRole(loadRole("dev"), { cwd: CWD });
  const args = claudeArgs(r, { model: "haiku", effort: "low", rest: ["say hi"] });
  const mcpAt = args.indexOf("--mcp-config");
  assert.deepEqual(args.slice(0, mcpAt), ["-p", "--tools", "Read,Edit,Write,Grep,Glob", "--strict-mcp-config"]);
  assert.deepEqual(JSON.parse(args[mcpAt + 1]), { mcpServers: r.mcpServers });
  assert.deepEqual(args.slice(mcpAt + 2), [
    "--allowedTools",
    r.allowedTools.join(","),
    "--permission-mode",
    "dontAsk",
    "--model",
    "haiku",
    "--effort",
    "low",
    "say hi",
  ]);
});
