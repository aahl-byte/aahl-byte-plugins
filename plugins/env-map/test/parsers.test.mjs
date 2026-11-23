import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseGitHook } from "../lib/collect/githooks.mjs";
import { parseScript } from "../lib/collect/scripts.mjs";
import { parseClaudeMd } from "../lib/collect/claude-md.mjs";
import { parseMarkdownPart } from "../lib/collect/markdown.mjs";
import { parseInstalledPlugins } from "../lib/collect/plugins.mjs";
import { gitHistory } from "../lib/collect/git-history.mjs";

const vars = { CLAUDE_PROJECT_DIR: "/p", HOME: "/h" };

test("git hook: fired by its git event, calls the scripts it runs, meta from header comments", () => {
  const out = parseGitHook({
    text: "#!/bin/sh\n# why: Repo rules before each commit.\nexec node scripts/check.mjs --rules\n",
    sourceId: "repo:.githooks/pre-commit",
    name: "pre-commit",
    vars,
    baseDir: "/p",
  });
  assert.deepEqual(out.boxes[0], {
    id: "githook:repo:.githooks/pre-commit",
    kind: "githook",
    label: "pre-commit",
    event: "git:pre-commit",
    source: "repo:.githooks/pre-commit",
    why: "Repo rules before each commit.",
  });
  assert.deepEqual(out.edges, [{ from: "event:git:pre-commit", to: "githook:repo:.githooks/pre-commit", kind: "fires" }]);
  assert.deepEqual(out.calls, [{ from: "githook:repo:.githooks/pre-commit", file: "/p/scripts/check.mjs" }]);
});

test("script: one box plus a contained box per rule, ids from rule ids or position", () => {
  const text = `export const meta = { why: "Refuses risky commands." };
const RULES = [
  { id: "no-env", why: "Secrets.", run: () => [] },
  { match: /\\bpkill\\b/, reason: "kill by pid" },
];`;
  const out = parseScript({ text, id: "script:repo:scripts/guard.mjs", file: "/p/scripts/guard.mjs", source: "repo:scripts/guard.mjs" });
  assert.deepEqual(
    out.boxes.map((b) => [b.id, b.kind, b.label, b.why]),
    [
      ["script:repo:scripts/guard.mjs", "script", "guard.mjs", "Refuses risky commands."],
      ["rule:repo:scripts/guard.mjs#no-env", "rule", "no-env", "Secrets."],
      ["rule:repo:scripts/guard.mjs#rule-2", "rule", "pkill", undefined],
    ]
  );
  assert.equal(out.boxes[2].pattern.sample, "pkill");
  assert.deepEqual(out.edges, [
    { from: "script:repo:scripts/guard.mjs", to: "rule:repo:scripts/guard.mjs#no-env", kind: "contains" },
    { from: "script:repo:scripts/guard.mjs", to: "rule:repo:scripts/guard.mjs#rule-2", kind: "contains" },
  ]);
});

test("CLAUDE.md: one box loaded at session start, one row per rule-table line with its enforcer tokens", () => {
  const text = `---
why: Tells agents the loop.
---
# Repo

| Rule | Enforced by |
|---|---|
| Kill by PID | \`scripts/guard.mjs\` |
| No .only in tests | \`scripts/check.mjs\` rule \`no-focused-tests\`; pre-commit hook |
| Findings need evidence | verifier brief (prose; no check yet) |

| Other | Table |
|---|---|
| a | b |
`;
  const out = parseClaudeMd({ text, id: "claude-md:repo:CLAUDE.md", source: "repo:CLAUDE.md", label: "CLAUDE.md" });
  assert.equal(out.boxes[0].why, "Tells agents the loop.");
  const rows = out.boxes.filter((b) => b.kind === "row");
  assert.deepEqual(
    rows.map((r) => [r.id, r.label, r.tokens, r.githooks]),
    [
      ["row:repo:CLAUDE.md#1", "Kill by PID", ["scripts/guard.mjs"], []],
      ["row:repo:CLAUDE.md#2", "No .only in tests", ["scripts/check.mjs", "no-focused-tests"], ["pre-commit"]],
      ["row:repo:CLAUDE.md#3", "Findings need evidence", [], []],
    ]
  );
  assert.deepEqual(out.edges[0], { from: "event:SessionStart", to: "claude-md:repo:CLAUDE.md", kind: "fires" });
  assert.equal(out.edges.filter((e) => e.kind === "contains").length, 3);
});

test("markdown part: meta, model-invocable flag and qualified names it mentions", () => {
  const text = `---
name: review
description: Review a diff.
layer: verify
takes: [review]
---
Then load pstack:verify and thinking:writing-style; see https://x.y and node:fs.`;
  const box = parseMarkdownPart({ text, id: "skill:plugin:pstack@aahl-byte:review", kind: "skill", label: "pstack:review", source: "plugin:pstack@aahl-byte" });
  assert.equal(box.layer, "verify");
  assert.deepEqual(box.takes, ["review"]);
  assert.equal(box.triggerable, true);
  assert.deepEqual(box.mentions, ["node:fs", "pstack:verify", "thinking:writing-style"]);
  const hidden = parseMarkdownPart({ text: "---\nname: x\n---\nbody", id: "skill:repo:x", kind: "skill", label: "x", source: "repo" });
  assert.equal(hidden.triggerable, false);
});

test("installed plugins: user scope plus local scope for this project, enabled state and owner", () => {
  const text = JSON.stringify({
    version: 2,
    plugins: {
      "thinking@aahl-byte": [{ scope: "user", installPath: "/c/thinking/0.5.0", version: "0.5.0" }],
      "vercel@official": [{ scope: "user", installPath: "/c/vercel/1", version: "1" }],
      "fd@official": [{ scope: "local", projectPath: "/other", installPath: "/c/fd", version: "u" }],
      "mine@official": [{ scope: "project", projectPath: "/p", installPath: "/c/mine", version: "2" }],
    },
  });
  const out = parseInstalledPlugins({ text, projectRoot: "/p", enabled: { "thinking@aahl-byte": true, "mine@official": true }, ourMarketplaces: ["aahl-byte"] });
  assert.deepEqual(
    out.map((p) => [p.key, p.enabled, p.owner, p.version]),
    [
      ["mine@official", true, "external", "2"],
      ["thinking@aahl-byte", true, "ours", "0.5.0"],
      ["vercel@official", false, "external", "1"],
    ]
  );
});

test("git history: change count, last change and changes inside the window ending at HEAD", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "env-map-git-"));
  const git = (args, date) => execFileSync("git", args, { cwd: dir, env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } });
  git(["init", "-q"]);
  git(["config", "user.email", "t@t"]);
  git(["config", "user.name", "t"]);
  for (const date of ["2026-01-01T00:00:00Z", "2026-03-01T00:00:00Z", "2026-03-10T00:00:00Z"]) {
    fs.appendFileSync(path.join(dir, "a.mjs"), date + "\n");
    git(["add", "."], date);
    git(["commit", "-qm", date], date);
  }
  const h = gitHistory(dir, ["a.mjs", "missing.mjs"], 30);
  assert.equal(h.asOf, "2026-03-10");
  assert.deepEqual(h.files["a.mjs"], { changes: 3, last: "2026-03-10", inWindow: 2 });
  assert.equal(h.files["missing.mjs"], undefined);
  assert.deepEqual(gitHistory(os.tmpdir(), ["a"], 30), { asOf: null, files: {} });
});
