import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFrontmatter, scriptMeta, scriptRules, regexSample, permissionPattern } from "../lib/text.mjs";

test("frontmatter reads scalars, quoted strings, flow and block lists, and skips nested maps", () => {
  const md = `---
name: jira
description: "Read: tickets"
why: Agents need Jira without a browser.
layer: prose
takes: [ticket-access, jira-format]
also:
  - one
  - two
metadata:
  type: feedback
disable-model-invocation: true
---
body text`;
  const { data, body } = parseFrontmatter(md);
  assert.equal(data.name, "jira");
  assert.equal(data.description, "Read: tickets");
  assert.equal(data.why, "Agents need Jira without a browser.");
  assert.deepEqual(data.takes, ["ticket-access", "jira-format"]);
  assert.deepEqual(data.also, ["one", "two"]);
  assert.equal(data.metadata, undefined);
  assert.equal(data["disable-model-invocation"], true);
  assert.equal(body, "body text");
});

test("frontmatter is empty when the file has none", () => {
  assert.deepEqual(parseFrontmatter("# Title\n").data, {});
});

test("script meta is read from export const meta without running the script", () => {
  const src = `process.exit(3);\nexport const meta = { why: "Refuses risky commands.", layer: "check", takes: ["kill-by-pid"] };\n`;
  assert.deepEqual(scriptMeta(src, ".mjs"), { why: "Refuses risky commands.", layer: "check", takes: ["kill-by-pid"] });
});

test("script meta for shell and python comes from header comments", () => {
  const src = `#!/bin/sh\n# why: Runs repo rules on staged lines.\n# layer: check\n# takes: no-env-files, no-focused-tests\nexec node x.mjs\n`;
  assert.deepEqual(scriptMeta(src, ""), { why: "Runs repo rules on staged lines.", layer: "check", takes: ["no-env-files", "no-focused-tests"] });
});

test("script meta is empty when absent", () => {
  assert.deepEqual(scriptMeta("console.log(1)\n", ".mjs"), {});
});

test("RULES objects give id, why, layer, takes and match patterns, surviving brackets inside regex literals", () => {
  const src = `
const X = 1;
const RULES = [
  {
    id: "no-npm",
    why: "Shared node_modules.",
    layer: "check",
    takes: ["shared-deps"],
    match: /(^|[;&|]\\s*)npm\\s+(i|install)\\b/,
    run: ({ added }) => added.filter((l) => /\\[x]/.test(l.text)).map((l) => \`\${l.file} bad\`),
  },
  {
    match: /\\bgit\\s+stash(\\s*$|\\s*[;&|])/i,
    reason: "Shared stash, see [docs]",
  },
];
function later() { return [1, 2]; }
`;
  const rules = scriptRules(src);
  assert.equal(rules.length, 2);
  assert.deepEqual(rules[0], {
    id: "no-npm",
    index: 0,
    layer: "check",
    pattern: { flags: "", sample: "npm i", source: "(^|[;&|]\\s*)npm\\s+(i|install)\\b" },
    takes: ["shared-deps"],
    why: "Shared node_modules.",
  });
  assert.equal(rules[1].id, undefined);
  assert.equal(rules[1].index, 1);
  assert.equal(rules[1].pattern.sample, "git stash");
  assert.equal(rules[1].pattern.flags, "i");
});

test("a script without RULES has no rules", () => {
  assert.deepEqual(scriptRules("const rules = [1];"), []);
});

test("regex samples are strings the regex itself matches", () => {
  for (const [source, sample] of [
    ["\\bgit\\s+worktree\\s+add\\b", "git worktree add"],
    ["\\b(pkill|killall)\\b", "pkill"],
    ["^rm -rf [a-z]+$", "rm -rf a"],
  ]) {
    assert.equal(regexSample(source, ""), sample);
    assert.match(sample, new RegExp(source));
  }
  assert.equal(regexSample("(?<=x)y", ""), null);
});

test("permission rules become patterns with a tool and a sample", () => {
  assert.deepEqual(permissionPattern("Bash(until *)"), { tool: "Bash", source: "^until .*$", flags: "", sample: "until x" });
  assert.deepEqual(permissionPattern("Bash(until:*)"), { tool: "Bash", source: "^until\\b.*$", flags: "", sample: "until" });
  assert.deepEqual(permissionPattern("WebFetch"), { tool: "WebFetch", source: "^.*$", flags: "", sample: "x" });
});
