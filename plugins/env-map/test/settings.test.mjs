import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSettings, calledFiles } from "../lib/collect/settings.mjs";

const vars = { CLAUDE_PROJECT_DIR: "/p", CLAUDE_PLUGIN_ROOT: "/plug", HOME: "/h" };

test("called files resolve through project, plugin and home variables and f= guards", () => {
  assert.deepEqual(calledFiles('f="$CLAUDE_PROJECT_DIR/scripts/guard.mjs"; [ -f "$f" ] || exit 0; node "$f"', vars, "/p"), ["/p/scripts/guard.mjs"]);
  assert.deepEqual(calledFiles('node "${CLAUDE_PLUGIN_ROOT}/hooks/start.mjs"', vars, "/p"), ["/plug/hooks/start.mjs"]);
  assert.deepEqual(calledFiles("python3 ~/.claude/hooks/redact.py", vars, "/p"), ["/h/.claude/hooks/redact.py"]);
  assert.deepEqual(calledFiles("exec node scripts/check.mjs --rules --staged", vars, "/p"), ["/p/scripts/check.mjs"]);
  assert.deepEqual(calledFiles("echo hi && npm test", vars, "/p"), []);
});

test("hooks become boxes under their event, with matcher, label and the files they call", () => {
  const text = JSON.stringify({
    hooks: {
      PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: 'f="$CLAUDE_PROJECT_DIR/scripts/guard.mjs"; [ -f "$f" ] || exit 0; node "$f"' }] }],
      Stop: [{ hooks: [{ type: "command", command: 'node "$CLAUDE_PROJECT_DIR/scripts/check.mjs" --hook' }, { type: "command", command: "echo done" }] }],
    },
    permissions: { deny: ["Bash(until *)"] },
  });
  const out = parseSettings({ text, sourceId: "repo:.claude/settings.json", vars, baseDir: "/p" });
  assert.equal(out.error, undefined);
  const hooks = out.boxes.filter((b) => b.kind === "hook");
  assert.deepEqual(
    hooks.map((h) => [h.id, h.event, h.matcher, h.label, h.inline]),
    [
      ["hook:repo:.claude/settings.json:PreToolUse:0.0", "PreToolUse", "Bash", "guard.mjs", false],
      ["hook:repo:.claude/settings.json:Stop:0.0", "Stop", "", "check.mjs --hook", false],
      ["hook:repo:.claude/settings.json:Stop:0.1", "Stop", "", "echo done", true],
    ]
  );
  assert.deepEqual(out.calls, [
    { from: "hook:repo:.claude/settings.json:PreToolUse:0.0", file: "/p/scripts/guard.mjs" },
    { from: "hook:repo:.claude/settings.json:Stop:0.0", file: "/p/scripts/check.mjs" },
  ]);
  const deny = out.boxes.find((b) => b.kind === "deny");
  assert.equal(deny.id, "deny:repo:.claude/settings.json:Bash(until *)");
  assert.equal(deny.pattern.source, "^until .*$");
  assert.deepEqual(
    out.edges.map((e) => [e.from, e.to, e.kind]),
    [
      ["event:PreToolUse", "hook:repo:.claude/settings.json:PreToolUse:0.0", "fires"],
      ["event:Stop", "hook:repo:.claude/settings.json:Stop:0.0", "fires"],
      ["event:Stop", "hook:repo:.claude/settings.json:Stop:0.1", "fires"],
      ["event:PreToolUse", "deny:repo:.claude/settings.json:Bash(until *)", "fires"],
    ]
  );
});

test("invalid JSON reports the parse error and no boxes", () => {
  const out = parseSettings({ text: "{ nope", sourceId: "repo:.claude/settings.json", vars, baseDir: "/p" });
  assert.match(out.error, /JSON/);
  assert.deepEqual(out.boxes, []);
});
