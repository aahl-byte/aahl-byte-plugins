import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CLEANER_SCHEMA, runRound, VERDICT_SCHEMA } from "../round.mjs";
import { triageSchema, validateTriage } from "../lib/triage.mjs";
import { CLEANUP_DIR, tmpDir } from "./helpers.mjs";

const FIXTURE = path.join(CLEANUP_DIR, "test", "fixture");
const CONFIG = {
  ...JSON.parse(fs.readFileSync(path.join(FIXTURE, "cleanup/config.json"), "utf8")),
  base: "origin/cleanup",
  prBase: "cleanup",
  worktree: {
    path: ".claude/worktrees/{name}",
    new: ["node", "scripts/wt.mjs", "new", "{name}", "--base", "{base}"],
    newDetached: ["node", "scripts/wt.mjs", "new", "{name}", "--base", "{base}", "--detach"],
    rm: ["node", "scripts/wt.mjs", "rm", "{name}"],
  },
  gate: { run: ["npm", "run", "check"], env: { CHECK_BASE: "{base}" } },
};

/** A fake repo and a fake world: worktree commands copy the fixture, git and gh answer from a script, node runs for real. */
function world({ status = " M src/routes/findings.ts\n", gateExit = 0, verdict, cleanOutcome = "changed", triage } = {}) {
  const repo = tmpDir();
  const calls = [];
  const sessions = [];
  const run = async (program, args, opts = {}) => {
    calls.push({ program, args, cwd: opts.cwd, env: opts.env });
    const ok = (stdout = "") => ({ exit: 0, stdout, stderr: "", ms: 1 });
    if (program === "node" && args[0] === "scripts/wt.mjs" && args[1] === "new") {
      const dir = path.join(repo, ".claude/worktrees", args[2]);
      fs.cpSync(FIXTURE, dir, { recursive: true });
      execFileSync("git", ["init", "-q"], { cwd: dir });
      return ok(`${dir}\n`);
    }
    if (program === "node" && args[0] === "scripts/wt.mjs") return ok();
    if (program === "node") {
      const r = spawnSync(program, args, { cwd: opts.cwd, encoding: "utf8" });
      return { exit: r.status, stdout: r.stdout, stderr: r.stderr, ms: 1 };
    }
    if (program === "git" && args[0] === "show") return ok(JSON.stringify(CONFIG));
    if (program === "git" && args[0] === "status") return ok(status);
    if (program === "git" && args[0] === "diff") return ok("diff --git a/src/routes/findings.ts b/src/routes/findings.ts\n");
    if (program === "git" && args[0] === "rev-parse") return { exit: 1, stdout: "", stderr: "", ms: 1 };
    if (program === "git" && args[0] === "ls-remote") return ok("");
    if (program === "git") return ok();
    if (program === "npm") return { exit: gateExit, stdout: gateExit ? "[tsc] failed" : "check: pass", stderr: "", ms: 5 };
    if (program === "gh" && args[1] === "create") return ok("https://github.com/o/r/pull/7\n");
    if (program === "gh") return ok();
    throw new Error(`unexpected ${program} ${args.join(" ")}`);
  };
  const session = async (s) => {
    sessions.push(s);
    const base = { exit: 0, costUsd: 0.5, durationMs: 60_000, turns: 9, sessionId: `${s.kind}-1` };
    if (s.kind === "triage") {
      const report = JSON.parse(fs.readFileSync(path.join(s.addDirs[0], "report.json"), "utf8"));
      const structured = triage
        ? triage(report)
        : {
            items: report.items.map((i) =>
              i.id === "raw-components-screen"
                ? { id: i.id, verdict: "real", reason: "five raw controls with hand-rolled styles", plan: "render the ui doors" }
                : i.id === "seed-alert-dialog-unstyled"
                  ? { id: i.id, verdict: "real", reason: "three dialogs work around the door", plan: "add an unstyled option to the door" }
                  : i.id === "seed-logging"
                    ? { id: i.id, verdict: "real", reason: "console output has no levels", plan: "adopt a logger", question: "Which logger?" }
                    : { id: i.id, verdict: "pedantic", reason: "boilerplate that reads better inline" }
            ),
          };
      return { ...base, structured };
    }
    if (s.kind === "clean") return { ...base, structured: { outcome: cleanOutcome, subject: "refactor(screen): render the ui doors", changes: ["replacing raw controls with ui doors"], flags: [], behavior: "Screen tests pass unchanged" } };
    return { ...base, costUsd: 1.25, structured: verdict ?? { verdict: "PASS", summary: "no behavior change", findings: [], checked: ["Test src/components: pass"] } };
  };
  return { repo, calls, sessions, io: { run, session, now: () => new Date("2026-11-23T12:00:00Z"), log: () => {} } };
}

const read = (dir, f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));

test("a dry run makes the report and the triage, plans the real items in triage order, and changes nothing", async () => {
  const w = world();
  const out = tmpDir();
  const result = await runRound({ repo: w.repo, round: "round-0", out, dryRun: true }, w.io);
  const dir = path.join(out, "round-0");
  assert.equal(result.roundDir, dir);
  assert.deepEqual(result.plan.map((p) => p.id), ["raw-components-screen", "seed-alert-dialog-unstyled"]);
  for (const f of ["report.json", "report.md", "triage.json", "plan.json", "summary.md"]) assert.ok(fs.existsSync(path.join(dir, f)), f);
  assert.deepEqual(validateTriage(read(dir, "triage.json"), read(dir, "report.json")), []);
  assert.deepEqual(read(dir, "plan.json").items.map((p) => p.id), result.plan.map((p) => p.id));
  assert.deepEqual(w.sessions.map((s) => s.kind), ["triage"]);
  const touching = w.calls.filter((c) => c.program === "gh" || (c.program === "git" && ["commit", "push", "add"].includes(c.args[0])));
  assert.deepEqual(touching, []);
  const worktree = w.calls.filter((c) => c.args[0] === "scripts/wt.mjs").map((c) => c.args.slice(1).join(" "));
  assert.deepEqual(worktree, ["new cleanup-round-0 --base origin/cleanup --detach", "rm cleanup-round-0"]);
  assert.ok(!fs.existsSync(path.join(out, "runs", "round-0.jsonl")), "no item ran, so no log lines");
});

test("the triage session is read-only, on the configured model, and asked for the triage schema", async () => {
  const w = world();
  await runRound({ repo: w.repo, round: "round-0", out: tmpDir(), dryRun: true }, w.io);
  const [s] = w.sessions;
  assert.equal(s.model, "opus");
  assert.equal(s.effort, "high");
  assert.deepEqual(s.tools, ["Read", "Grep", "Glob"]);
  const report = JSON.parse(fs.readFileSync(path.join(s.addDirs[0], "report.json"), "utf8"));
  assert.deepEqual(s.schema, triageSchema(report));
  assert.equal(s.cwd, path.join(w.repo, ".claude/worktrees/cleanup-round-0"));
  assert.match(s.prompt, /report\.md/);
});

test("a triage that fails validation gets one fresh session, then the round stops", async () => {
  let n = 0;
  const w = world({ triage: () => (n++, { items: [] }) });
  await assert.rejects(runRound({ repo: w.repo, round: "round-0", out: tmpDir(), dryRun: true }, w.io), /triage is invalid after 2 sessions/);
  assert.equal(n, 2);
  assert.match(w.sessions[1].prompt, /not triaged/, "the second session is told what the first got wrong");
  assert.equal(w.sessions[1].resume, undefined, "never a resumed session");
});

test("--items narrows the plan to the ids asked for", async () => {
  const w = world();
  const result = await runRound({ repo: w.repo, round: "round-0", out: tmpDir(), dryRun: true, items: ["raw-components-screen"] }, w.io);
  assert.deepEqual(result.plan.map((p) => p.id), ["raw-components-screen"]);
});

test("an item that passes: fresh worktree, cleaner, gate, commit, push, PR into cleanup, Fable evaluator, merge, one log line", async () => {
  const w = world();
  const out = tmpDir();
  await runRound({ repo: w.repo, round: "round-1", out, items: ["raw-components-screen"] }, w.io);
  assert.deepEqual(w.sessions.map((s) => [s.kind, s.role ?? null, s.model, s.effort]), [
    ["triage", null, "opus", "high"],
    ["clean", "cleanup", "opus", "high"],
    ["evaluate", "verify", "fable", "high"],
  ]);
  const wt = path.join(w.repo, ".claude/worktrees/cleanup-raw-components-screen");
  const at = (program, sub) => w.calls.find((c) => c.program === program && c.args[0] === sub && c.cwd === wt);
  assert.deepEqual(w.calls.find((c) => c.args[1] === "new" && c.args[2] === "cleanup-raw-components-screen").args, ["scripts/wt.mjs", "new", "cleanup-raw-components-screen", "--base", "origin/cleanup"]);
  assert.equal(at("npm", "run").env.CHECK_BASE, "origin/cleanup");
  assert.deepEqual(at("git", "push").args, ["push", "-u", "origin", "cleanup-raw-components-screen"]);
  const create = w.calls.find((c) => c.program === "gh" && c.args[1] === "create");
  assert.deepEqual(create.args.slice(0, 6), ["pr", "create", "--base", "cleanup", "--head", "cleanup-raw-components-screen"]);
  assert.ok(w.calls.some((c) => c.program === "gh" && c.args.join(" ") === "pr merge https://github.com/o/r/pull/7 --merge"));
  assert.match(w.sessions[2].prompt, /diff --git a\/src\/routes\/findings\.ts/);
  const lines = fs.readFileSync(path.join(out, "runs", "round-1.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  assert.equal(lines.length, 1);
  const [line] = lines;
  assert.equal(line.item, "raw-components-screen");
  assert.equal(line.triage.reason, "five raw controls with hand-rolled styles");
  assert.equal(line.gate.pass, true);
  assert.equal(line.pr, "https://github.com/o/r/pull/7");
  assert.equal(line.evaluate.verdict, "PASS");
  assert.equal(line.evaluate.costUsd, 1.25);
  assert.equal(line.clean.costUsd, 0.5);
  assert.equal(line.outcome, "merged");
  assert.ok(fs.readFileSync(path.join(out, "runs", "round-1.md"), "utf8").includes("raw-components-screen"));
});

test("a FAIL with evidence leaves the PR open; a FAIL with none is not taken as a verdict", async () => {
  const failing = { verdict: "FAIL", summary: "the Save button lost its focus ring", findings: [{ claim: "focus ring gone", evidence: { kind: "command", detail: "E2E e2e/ui-polish.spec.ts: 1 failed" } }], checked: [] };
  const w = world({ verdict: failing });
  const out = tmpDir();
  await runRound({ repo: w.repo, round: "round-1", out, items: ["raw-components-screen"] }, w.io);
  assert.ok(!w.calls.some((c) => c.program === "gh" && c.args[1] === "merge"));
  const line = JSON.parse(fs.readFileSync(path.join(out, "runs", "round-1.jsonl"), "utf8"));
  assert.equal(line.outcome, "left-open");
  assert.equal(line.evaluate.findings[0].evidence.kind, "command");

  const bare = world({ verdict: { verdict: "FAIL", summary: "looks risky", findings: [], checked: [] } });
  const out2 = tmpDir();
  await runRound({ repo: bare.repo, round: "round-1", out: out2, items: ["raw-components-screen"] }, bare.io);
  const line2 = JSON.parse(fs.readFileSync(path.join(out2, "runs", "round-1.jsonl"), "utf8"));
  assert.equal(line2.evaluate.verdict, "INVALID");
  assert.equal(line2.outcome, "left-open");
});

test("no diff means no PR; a failing gate keeps the worktree and opens nothing", async () => {
  const quiet = world({ status: "", cleanOutcome: "no-change" });
  const out = tmpDir();
  await runRound({ repo: quiet.repo, round: "round-1", out, items: ["raw-components-screen"] }, quiet.io);
  assert.equal(JSON.parse(fs.readFileSync(path.join(out, "runs", "round-1.jsonl"), "utf8")).outcome, "no-change");
  assert.ok(!quiet.calls.some((c) => c.program === "gh"));

  const red = world({ gateExit: 1 });
  const out2 = tmpDir();
  await runRound({ repo: red.repo, round: "round-1", out: out2, items: ["raw-components-screen"] }, red.io);
  const line = JSON.parse(fs.readFileSync(path.join(out2, "runs", "round-1.jsonl"), "utf8"));
  assert.equal(line.outcome, "gate-failed");
  assert.match(line.gate.tail, /\[tsc\] failed/);
  assert.ok(!red.calls.some((c) => c.program === "gh" || (c.program === "git" && c.args[0] === "push")));
  assert.ok(!red.calls.some((c) => c.args[1] === "rm" && c.args[2] === "cleanup-raw-components-screen"), "the failing worktree is kept to look at");
});

test("a cleaner session that ends with no answer is not committed: no gate, no PR, the worktree kept", async () => {
  const w = world();
  const session = w.io.session;
  w.io.session = async (s) => (s.kind === "clean" ? { exit: 1, structured: null, costUsd: 0.2, durationMs: 1000, turns: 3, sessionId: "c", subtype: "error_max_turns" } : session(s));
  const out = tmpDir();
  await runRound({ repo: w.repo, round: "round-1", out, items: ["raw-components-screen"] }, w.io);
  const line = JSON.parse(fs.readFileSync(path.join(out, "runs", "round-1.jsonl"), "utf8"));
  assert.equal(line.outcome, "clean-failed");
  assert.ok(!w.calls.some((c) => c.program === "npm" || c.program === "gh"));
  assert.ok(!w.calls.some((c) => c.args[1] === "rm" && c.args[2] === "cleanup-raw-components-screen"));
});

test("the cleaner's and evaluator's schemas hold the rules the runner checks, so a session fixes a violation in-session", () => {
  assert.equal(CLEANER_SCHEMA.properties.subject.pattern, "^[a-z]+(\\([^)]+\\))?!?: \\S");
  assert.equal(CLEANER_SCHEMA.properties.subject.maxLength, 100);
  assert.deepEqual(VERDICT_SCHEMA.if, { properties: { verdict: { const: "FAIL" } } });
  assert.deepEqual(VERDICT_SCHEMA.then, { properties: { findings: { minItems: 1 } } });
  assert.equal(VERDICT_SCHEMA.properties.findings.items.properties.evidence.properties.detail.minLength, 1);
});

test("a rerun of an item gets a fresh worktree and branch name, never the old one", async () => {
  const w = world();
  fs.mkdirSync(path.join(w.repo, ".claude/worktrees/cleanup-raw-components-screen"), { recursive: true });
  await runRound({ repo: w.repo, round: "round-2", out: tmpDir(), items: ["raw-components-screen"] }, w.io);
  assert.ok(w.calls.some((c) => c.args[1] === "new" && c.args[2] === "cleanup-raw-components-screen-2"));
});
