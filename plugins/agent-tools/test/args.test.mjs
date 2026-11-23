import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { fakeCtx, INJECTION } from "./helpers.mjs";
import { loadServer, serverNames } from "../lib/server.mjs";
import { buildSpec } from "../lib/call.mjs";

const WT = "/repo/.claude/worktrees/probe";
const P = (name) => `/plugins/${name}`;

// [server, tool, input, expected spec fields]
const CASES = [
  ["dev", "Test", { files: ["src/lib/a.test.ts"] }, { program: "npx", args: ["vitest", "run", "--reporter=json", "--outputFile=/tmp/T/vitest.json", "src/lib/a.test.ts"] }],
  ["dev", "Test", { files: ["src/lib/a.ts"], related: true }, { program: "npx", args: ["vitest", "related", "--run", "--reporter=json", "--outputFile=/tmp/T/vitest.json", "src/lib/a.ts"] }],
  ["dev", "Check", {}, { program: "npm", args: ["run", "check"] }],
  ["dev", "Git_Status", {}, { program: "git", args: ["--no-pager", "status", "--porcelain=v1", "--branch", "--untracked-files=all"] }],
  ["dev", "Git_Diff", { path: "src/a.ts", staged: true }, { program: "git", args: ["--no-pager", "diff", "--no-color", "--no-ext-diff", "--no-textconv", "--staged", "--", "src/a.ts"] }],
  [
    "dev",
    "E2E",
    { spec: "e2e/access.spec.ts", project: "phone" },
    {
      program: "npx",
      args: ["playwright", "test", "-c", "e2e/playwright.config.ts", "--reporter=json", "--project=phone", "e2e/access.spec.ts"],
      env: { E2E_PORT: "3530", PLAYWRIGHT_JSON_OUTPUT_NAME: "/tmp/T/playwright.json" },
    },
  ],

  ["todo", "Todo_Get", { query: "w1-qa", log: true }, { program: "todo", args: ["--agent", "get", "--log", "--", "w1-qa"] }],
  ["todo", "Todo_List", { status: "review", tag: "wave-1" }, { program: "todo", args: ["--agent", "list", "--status=review", "--tag=wave-1"] }],
  ["todo", "Todo_Note", { query: "w1-qa", text: "found it" }, { program: "todo", args: ["--agent", "note", "--", "w1-qa", "found it"] }],
  ["todo", "Todo_Log", { query: "w1-qa", text: "ran e2e" }, { program: "todo", args: ["--agent", "log", "--", "w1-qa", "ran e2e"] }],
  ["todo", "Todo_Task", { query: "w1-qa", action: "add", title: "write spec", phase: 2 }, { program: "todo", args: ["--agent", "task", "add", "--phase=2", "--", "w1-qa", "write spec"] }],
  ["todo", "Todo_Task", { query: "w1-qa", action: "done", id: 3 }, { program: "todo", args: ["--agent", "task", "done", "--", "w1-qa", "3"] }],
  ["todo", "Todo_Url", { query: "w1-qa", url: "https://github.com/o/r/pull/1", type: "pr" }, { program: "todo", args: ["--agent", "url", "--type=pr", "--", "w1-qa", "https://github.com/o/r/pull/1"] }],
  ["todo", "Todo_Doc", { query: "w1-qa", file: "tmp/brief.md", name: "brief.md" }, { program: "todo", args: ["--agent", "doc", "add", "--name=brief.md", "--", "w1-qa", "tmp/brief.md"] }],
  ["todo", "Todo_Request", { query: "w1-qa", text: "new request" }, { program: "todo", args: ["--agent", "request", "--text=new request", "--", "w1-qa"] }],
  ["todo", "Todo_Status", { query: "w1-qa", to: "review" }, { program: "todo", args: ["--agent", "review", "--", "w1-qa"] }],
  ["todo", "Todo_Ask", { query: "w1-qa", text: "which port?" }, { program: "todo", args: ["--agent", "ask", "--", "w1-qa", "which port?"] }],

  ["jira", "Jira_Read", { key: "SR-1234" }, { program: "jira", args: ["read:ticket", "--", "SR-1234"] }],
  ["jira", "Jira_Comments", { key: "SR-1234" }, { program: "jira", args: ["read:comments", "--", "SR-1234"] }],
  ["jira", "Jira_Search", { jql: "project = SR AND status = Done" }, { program: "jira", args: ["read:jql", "--list", "--limit=20", "--", "project = SR AND status = Done"] }],
  ["jira", "Jira_Search", { project: "SR", title: "ROSM", allUsers: true }, { program: "jira", args: ["read:project", "--list", "--limit=20", "--title=ROSM", "--all-users", "--", "SR"] }],
  ["jira", "Jira_Comment", { key: "SR-1234", body: "h3. Done\nShipped." }, { program: "jira", args: ["add:comment", "--", "SR-1234", "-"], stdin: "h3. Done\nShipped." }],
  ["jira", "Jira_Link", { from: "SR-1", to: "SR-2", type: "Relates" }, { program: "jira", args: ["add:link", "--type=Relates", "--", "SR-1", "SR-2"] }],
  ["jira", "Jira_Transition", { key: "SR-1", status: "In Progress" }, { program: "jira", args: ["set:status", "--", "SR-1", "In Progress"] }],

  ["wt-session", "Session_List", { since: "7d", dir: "/mnt/rain/git" }, { program: "wt-session", args: ["list", "--since", "7d", "--dir", "/mnt/rain/git"] }],
  ["wt-session", "Session_Read", { id: "@expert" }, { program: "wt-session", args: ["read", "@expert"] }],
  [
    "wt-session",
    "Session_Ask",
    { dir: "/mnt/rain/git/repo", text: "how does X work?", model: "sonnet", effort: "low" },
    { program: "wt-session", args: ["ask", "/mnt/rain/git/repo", "-", "--model", "sonnet", "--effort", "low", "--timeout", "900"], stdin: "how does X work?" },
  ],
  ["wt-session", "Session_Send", { who: "a1b2", text: "done" }, { program: "wt-session", args: ["send", "a1b2", "-"], stdin: "done" }],

  ["explore-db", "Db_Query", { env: "dev", sql: "SELECT 1" }, { program: "explore-db", args: ["--dev", "--format=table", "--no-pager"], stdin: "SELECT 1" }],
  ["explore-db", "Db_Schema", { env: "staging", action: "show", target: "service.inspection" }, { program: "explore-db", args: ["schema", "show", "--staging", "--", "service.inspection"] }],
  ["explore-db", "Db_Schema", { env: "dev", action: "list" }, { program: "explore-db", args: ["schema", "list", "--dev"] }],

  ["db-request", "DbRequest_Status", { id: "photo-assoc", open: true }, { program: "db-request", args: ["status", "--id=photo-assoc", "--open"] }],
  ["db-request", "DbRequest_Lint", { script: "docs/db/a.sql" }, { program: "db-request", args: ["lint", "--", "docs/db/a.sql"] }],
  ["db-request", "DbRequest_Diff", { id: "51" }, { program: "db-request", args: ["diff", "--id=51"] }],
  [
    "db-request",
    "DbRequest_Submit",
    { name: "photo-assoc", description: "photo association table", script: "docs/db/a.sql", ticket: "SR-4878" },
    { program: "db-request", args: ["submit", "--name=photo-assoc", "--description=photo association table", "--script=docs/db/a.sql", "--ticket=SR-4878"] },
  ],
  ["db-request", "DbRequest_Note", { id: "51", body: "rebased" }, { program: "db-request", args: ["note", "--id=51", "--", "rebased"] }],

  ["plugin-scripts", "EnvMap_Check", {}, { program: "node", args: [`${P("env-map")}/bin/env-map.mjs`, "check", "--root", WT] }],
  ["plugin-scripts", "DevKernel_Validate", { file: "tmp/initiatives/x/status.yaml" }, { program: "python3", args: [`${P("dev-kernel")}/scripts/dk/validate.py`, "tmp/initiatives/x/status.yaml", "--verbose"] }],
  ["plugin-scripts", "DevKernel_Notify", { message: "Initiative x complete" }, { program: "node", args: [`${P("dev-kernel")}/scripts/comms/ntfy.js`, "Initiative x complete"] }],
  ["plugin-scripts", "Notes_Verify", { root: "notes" }, { program: "node", args: [`${P("notes-architect")}/scripts/verify-content.js`, "notes"] }],
  ["plugin-scripts", "PlanClarity_Init", { name: "auth-redesign" }, { program: "bash", args: [`${P("plan-clarity")}/scripts/review/init.sh`, "auth-redesign"], env: { CLAUDE_PLUGIN_ROOT: P("plan-clarity") } }],
  ["plugin-scripts", "PlanClarity_Validate", { name: "auth-redesign", configs: ["risk.config.yaml"] }, { program: "node", args: ["scripts/validate.js", "risk.config.yaml"], cwd: `${WT}/docs/review/auth-redesign` }],
  ["plugin-scripts", "Pstack_UpstreamDiff", { stat: true, paths: ["skills/arena"] }, { program: "bash", args: [`${P("pstack")}/scripts/upstream-diff.sh`, "--stat", "--", "skills/arena"] }],
  ["plugin-scripts", "Pstack_DoorsCheck", {}, { program: "node", args: [`${P("pstack")}/scripts/doors/check.mjs`, "--repo", WT, "--report-only"] }],
  [
    "plugin-scripts",
    "Pstack_DoorsCheck",
    { files: ["src/components/A.tsx", "src/b.ts"] },
    { program: "node", args: [`${P("pstack")}/scripts/doors/check.mjs`, "--repo", WT, "--report-only", "--files=src/components/A.tsx,src/b.ts"] },
  ],
  ["plugin-scripts", "Pstack_CleanupReport", {}, { program: "node", args: [`${P("pstack")}/scripts/cleanup/report.mjs`, "--repo", WT, "--out", "/tmp/T/report"] }],
  [
    "plugin-scripts",
    "Research_PdfToText",
    { source: "https://arxiv.org/pdf/1.pdf", pages: "1-8", downloadDir: "tmp/pdfs" },
    { program: "uv", args: ["run", "--script", `${P("research")}/scripts/pdf_to_text.py`, "--download-dir=tmp/pdfs", "--pages=1-8", "--", "https://arxiv.org/pdf/1.pdf"] },
  ],
  ["plugin-scripts", "Specs_Tree", { json: true }, { program: "python3", args: [`${P("spec-management")}/scripts/spec-tree.py`, "--json"] }],
];

const ctx = { ...fakeCtx({ cwd: WT }), pluginDir: P };
const SHELLS = new Set(["sh", "bash", "zsh", "dash", "/bin/sh", "/bin/bash"]);

async function toolsByName() {
  const all = new Map();
  for (const server of serverNames()) for (const t of await loadServer(server)) all.set(`${server}/${t.name}`, t);
  return all;
}

test("every tool on every server has an argument-building case", async () => {
  const covered = new Set(CASES.map(([s, t]) => `${s}/${t}`));
  const all = await toolsByName();
  const missing = [...all.keys()].filter((k) => !covered.has(k) && !all.get(k).handle);
  assert.deepEqual(missing, []);
});

for (const [server, name, input, expected] of CASES) {
  test(`${server} ${name} builds ${JSON.stringify(expected.args)}`, async () => {
    const tool = (await toolsByName()).get(`${server}/${name}`);
    assert.ok(tool, `${server}/${name} exists`);
    const spec = await buildSpec(tool, input, ctx);
    for (const [key, value] of Object.entries(expected)) assert.deepEqual(spec[key], value, key);
    assert.equal(spec.shell, undefined, "no shell option");
  });
}

/** Every string field, top level or inside an array, as [path, setter]. */
function stringFields(shape) {
  const out = [];
  for (const [key, schema] of Object.entries(shape)) {
    const inner = schema instanceof z.ZodOptional || schema instanceof z.ZodDefault ? schema.unwrap() : schema;
    if (inner instanceof z.ZodString) out.push([key, () => INJECTION]);
    else if (inner instanceof z.ZodArray && inner.element instanceof z.ZodString) out.push([key, () => [INJECTION]]);
  }
  return out;
}

for (const [server, name, input] of CASES) {
  test(`${server} ${name}: "${INJECTION}" in any string field is refused or stays one literal argv element`, async () => {
    const tool = (await toolsByName()).get(`${server}/${name}`);
    for (const [field, value] of stringFields(tool.input)) {
      let spec;
      try {
        spec = await buildSpec(tool, { ...input, [field]: value() }, ctx);
      } catch {
        continue; // refused by the input schema or the tool's own check
      }
      assert.ok(!(SHELLS.has(spec.program) && spec.args.includes("-c")), `${field}: no shell -c`);
      if (spec.stdin === INJECTION) continue;
      const holders = spec.args.filter((a) => a.includes(INJECTION));
      assert.ok(holders.length <= 1, `${field}: at most one argv element holds the value`);
      if (holders.length) assert.match(holders[0], /^(--[a-z-]+=)?; rm -rf \/$/, `${field}: the element is the value, or --flag=value`);
      const fragments = spec.args.filter((a) => !a.includes(INJECTION) && /^;$|rm -rf|^-rf$/.test(a));
      assert.deepEqual(fragments, [], `${field}: no piece of the value lands in argv on its own`);
    }
  });
}

test("a value starting with a dash is refused, so it can never become a flag", async () => {
  const all = await toolsByName();
  await assert.rejects(buildSpec(all.get("dev/Test"), { files: ["--watch"] }, ctx));
  await assert.rejects(buildSpec(all.get("dev/Git_Diff"), { path: "--output=/etc/passwd" }, ctx));
  await assert.rejects(buildSpec(all.get("wt-session/Session_Read"), { id: "--port" }, ctx));
});

test("a path that leaves the working directory is refused", async () => {
  const all = await toolsByName();
  await assert.rejects(buildSpec(all.get("dev/Test"), { files: ["../../../etc/passwd"] }, ctx));
  await assert.rejects(buildSpec(all.get("todo/Todo_Doc"), { query: "x", file: "/etc/passwd" }, ctx));
});

test("Jira_Comment refuses non-ASCII text, which the Jira stack turns into mojibake", async () => {
  const tool = (await toolsByName()).get("jira/Jira_Comment");
  await assert.rejects(buildSpec(tool, { key: "SR-1", body: "done — shipped" }, ctx), /ASCII/);
});

test("E2E reads the worktree's port with the project's port command", async () => {
  const calls = [];
  const tool = (await toolsByName()).get("dev/E2E");
  const spec = await buildSpec(tool, { spec: "e2e/access.spec.ts" }, { ...ctx, run: async (s) => (calls.push(s), { exit: 0, stdout: "3540\n", stderr: "" }) });
  assert.deepEqual(calls.map((c) => [c.program, c.args]), [["node", ["scripts/wt.mjs", "port", "probe"]]]);
  assert.equal(spec.env.E2E_PORT, "3540");
});
