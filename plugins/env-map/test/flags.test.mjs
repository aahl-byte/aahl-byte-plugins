import { test } from "node:test";
import assert from "node:assert/strict";
import { makeEnv, mapEnv } from "./helpers/env.mjs";

const flagged = (graph, flag) =>
  graph.flags
    .filter((f) => f.flag === flag)
    .map((f) => f.box)
    .sort();

const hook = (file, extra = "") => ({ type: "command", command: `node "$CLAUDE_PROJECT_DIR/${file}"${extra}` });

test("crowded event: more hooks on one event than the threshold", () => {
  const scripts = Object.fromEntries(["a", "b", "c", "d"].map((n) => [`scripts/${n}.mjs`, ""]));
  const crowded = mapEnv(
    makeEnv({ repo: { ...scripts, ".claude/settings.json": { hooks: { SessionStart: [{ hooks: ["a", "b", "c", "d"].map((n) => hook(`scripts/${n}.mjs`)) }] } } } })
  );
  assert.deepEqual(flagged(crowded, "crowded-event"), ["event:SessionStart"]);
  assert.equal(crowded.flags.find((f) => f.flag === "crowded-event").detail, "4 hooks (more than 3)");
  const atLimit = mapEnv(
    makeEnv({ repo: { ...scripts, ".claude/settings.json": { hooks: { SessionStart: [{ hooks: ["a", "b", "c"].map((n) => hook(`scripts/${n}.mjs`)) }] } } } })
  );
  assert.deepEqual(flagged(atLimit, "crowded-event"), []);
});

test("overlap: two rules that match the same command", () => {
  const graph = mapEnv(
    makeEnv({
      repo: {
        "scripts/guard.mjs": `const RULES = [
  { id: "force-push", match: /\\bgit\\s+push\\s+--force\\b/ },
  { id: "any-force", match: /\\bpush\\s+--force/ },
  { id: "pkill", match: /\\bpkill\\b/ },
];`,
        ".claude/settings.json": { hooks: { PreToolUse: [{ matcher: "Bash", hooks: [hook("scripts/guard.mjs")] }] } },
      },
    })
  );
  assert.deepEqual(flagged(graph, "overlap"), ["rule:repo:scripts/guard.mjs#any-force", "rule:repo:scripts/guard.mjs#force-push"]);
});

test("unenforced prose: a CLAUDE.md row with no enforcer", () => {
  const graph = mapEnv(
    makeEnv({
      repo: {
        "scripts/check.mjs": "",
        ".claude/settings.json": { hooks: { Stop: [{ hooks: [hook("scripts/check.mjs")] }] } },
        "CLAUDE.md": "| Rule | Enforced by |\n|---|---|\n| Gate passes | `scripts/check.mjs` |\n| Be kind | nothing yet |\n",
      },
    })
  );
  assert.deepEqual(flagged(graph, "unenforced-prose"), ["row:repo:CLAUDE.md#2"]);
});

test("unenforced prose: a prose-layer skill changed recently", () => {
  const skill = (n) => `---\nname: ${n}\ndescription: d\nlayer: prose\n---\n`;
  const graph = mapEnv(
    makeEnv({
      commits: [
        { date: "2026-01-01T00:00:00Z", files: { ".claude/skills/old/SKILL.md": skill("old") } },
        { date: "2026-03-01T00:00:00Z", files: { ".claude/skills/fresh/SKILL.md": skill("fresh") } },
      ],
    })
  );
  assert.deepEqual(flagged(graph, "unenforced-prose"), ["skill:repo:.claude/skills/fresh"]);
});

test("churn: more changes to one file inside the window than the threshold", () => {
  const days = (n) => `2026-03-${String(n).padStart(2, "0")}T00:00:00Z`;
  const commits = [];
  for (let i = 1; i <= 6; i++) commits.push({ date: days(i), files: { "scripts/hot.mjs": `// ${i}\n`, ...(i <= 5 ? { "scripts/warm.mjs": `// ${i}\n` } : {}) } });
  commits[0].files[".claude/settings.json"] = JSON.stringify({ hooks: { Stop: [{ hooks: [hook("scripts/hot.mjs"), hook("scripts/warm.mjs")] }] } });
  const graph = mapEnv(makeEnv({ commits }));
  assert.deepEqual(flagged(graph, "churn"), ["script:repo:scripts/hot.mjs"]);
  assert.equal(graph.flags.find((f) => f.flag === "churn").detail, "6 changes in 30 days (more than 5)");
});

test("cross-boundary edge: an external hook acting on repo Bash commands", () => {
  const graph = mapEnv(
    makeEnv({
      repo: { "scripts/guard.mjs": "", ".claude/settings.json": { hooks: { PreToolUse: [{ matcher: "Bash", hooks: [hook("scripts/guard.mjs")] }] } } },
      home: {
        ".claude/hooks/del.py": "",
        ".claude/hooks/redact.py": "",
        ".claude/settings.json": {
          hooks: {
            PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "python3 ~/.claude/hooks/del.py" }] }],
            PermissionRequest: [{ matcher: "*", hooks: [{ type: "command", command: "python3 ~/.claude/hooks/del.py" }] }],
            PostToolUse: [{ matcher: "mcp__claude_ai_.*", hooks: [{ type: "command", command: "python3 ~/.claude/hooks/redact.py" }] }],
          },
        },
      },
    })
  );
  assert.deepEqual(flagged(graph, "cross-boundary"), [
    "hook:global:~/.claude:settings.json:PermissionRequest:0.0",
    "hook:global:~/.claude:settings.json:PreToolUse:0.0",
  ]);
});

test("orphan: a script nothing calls, and a skill nothing names or triggers", () => {
  const graph = mapEnv(
    makeEnv({
      home: { ".claude/hooks/unused.py": "", ".claude/hooks/test_unused.py": "" },
      repo: {
        ".claude/skills/silent/SKILL.md": "---\nname: silent\n---\nNo description.\n",
        ".claude/skills/loud/SKILL.md": "---\nname: loud\ndescription: Model can trigger this.\n---\n",
      },
      plugins: {
        "kit@aahl-byte": {
          files: {
            "skills/caller/SKILL.md": "---\nname: caller\ndescription: d\n---\nLoad kit:quiet.\n",
            "skills/quiet/SKILL.md": "---\nname: quiet\n---\nNamed by caller.\n",
          },
        },
      },
    })
  );
  assert.deepEqual(flagged(graph, "orphan"), ["script:global:~/.claude:hooks/unused.py", "skill:repo:.claude/skills/silent"]);
});
