#!/usr/bin/env node
// cleanup round: report, triage, then per real item a fresh worktree, cleaner, gate, PR and evaluator. All git work happens here.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { cleaningList, triageSchema, validateTriage } from "./lib/triage.mjs";
import { killActive, runProgram, runSession } from "./lib/sessions.mjs";

export const meta = {
  why: "Runs a cleanup round end to end with every git step in code, so sessions only edit files and each item gets a fresh cleaner and an independent evaluator.",
  layer: "verify",
  takes: ["run-cleanup-round"],
};

const PSTACK = path.resolve(import.meta.dirname, "..", "..");
const BRIEFS = path.join(PSTACK, "skills", "cleanup", "references");
const REPORT_SCRIPT = path.join(import.meta.dirname, "report.mjs");
const INLINE_DIFF_BYTES = 60_000;
const MINUTE = 60_000;

export const DEFAULTS = {
  base: "origin/cleanup",
  prBase: "cleanup",
  worktree: {
    path: ".claude/worktrees/{name}",
    new: ["git", "worktree", "add", "-b", "{name}", ".claude/worktrees/{name}", "{base}"],
    newDetached: ["git", "worktree", "add", "--detach", ".claude/worktrees/{name}", "{base}"],
    rm: ["git", "worktree", "remove", ".claude/worktrees/{name}"],
  },
  gate: { run: ["npm", "run", "check"], env: { CHECK_BASE: "{base}" }, timeoutMin: 30 },
  sessions: {
    triage: { model: "opus", effort: "high", tools: ["Read", "Grep", "Glob"], timeoutMin: 90 },
    clean: { model: "opus", effort: "high", role: "cleanup", timeoutMin: 120 },
    evaluate: { model: "fable", effort: "high", role: "verify", timeoutMin: 150 },
  },
};

export const CLEANER_SCHEMA = {
  type: "object",
  properties: {
    outcome: { type: "string", enum: ["changed", "no-change"] },
    subject: {
      type: "string",
      pattern: "^[a-z]+(\\([^)]+\\))?!?: \\S",
      maxLength: 100,
      description: "a conventional commit subject, e.g. refactor(findings): fold parseId copies into lib/api/ids",
    },
    changes: { type: "array", items: { type: "string" }, description: "one bullet per concept, each opening on the operation" },
    behavior: { type: "string", description: "the tests and checks that show behavior is unchanged, with results" },
    flags: { type: "array", items: { type: "string" }, description: "ids of flags added or tuned in doors/flags.json" },
    notes: { type: "string", description: "what you could not do or verify" },
  },
  required: ["outcome", "subject", "changes", "behavior"],
  additionalProperties: false,
};

export const VERDICT_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["PASS", "FAIL"] },
    summary: { type: "string", description: "one line" },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          claim: { type: "string" },
          evidence: {
            type: "object",
            properties: { kind: { type: "string", enum: ["command", "screenshot", "behavior"] }, detail: { type: "string", minLength: 1 } },
            required: ["kind", "detail"],
            additionalProperties: false,
          },
        },
        required: ["claim", "evidence"],
        additionalProperties: false,
      },
    },
    checked: { type: "array", items: { type: "string" }, description: "each command run, with its result" },
  },
  required: ["verdict", "summary", "findings", "checked"],
  additionalProperties: false,
  if: { properties: { verdict: { const: "FAIL" } } },
  then: { properties: { findings: { minItems: 1 } } },
};

/** PASS, FAIL with evidenced findings, or INVALID: a FAIL with no evidence is not a verdict. */
export function checkVerdict(v) {
  if (!v || (v.verdict !== "PASS" && v.verdict !== "FAIL")) return "INVALID";
  if (v.verdict === "PASS") return "PASS";
  const evidenced = (v.findings ?? []).filter((f) => f?.evidence?.detail?.trim());
  return evidenced.length ? "FAIL" : "INVALID";
}

const fill = (argv, vars) => argv.map((a) => a.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m));
const tail = (text, n = 40) => (text ?? "").trim().split("\n").slice(-n).join("\n");
const brief = (name) => fs.readFileSync(path.join(BRIEFS, `${name}.md`), "utf8");

function merge(defaults, raw = {}) {
  return {
    ...defaults,
    ...raw,
    worktree: { ...defaults.worktree, ...raw.worktree },
    gate: { ...defaults.gate, ...raw.gate },
    sessions: Object.fromEntries(Object.entries(defaults.sessions).map(([k, v]) => [k, { ...v, ...raw.sessions?.[k] }])),
  };
}

function itemBlock(entry) {
  const { item } = entry;
  const out = [
    "## Your item",
    "",
    `id: ${item.id}`,
    `kind: ${item.kind}`,
    `title: ${item.title}`,
    `files: ${item.files.join(", ") || "(none listed)"}`,
    `size: ${item.size.files} files, ${item.size.lines} lines`,
    "",
    "evidence:",
    ...item.evidence.map((e) => (e.includes("\n") ? "```\n" + e + "\n```" : `- ${e}`)),
  ];
  if (item.fragment) out.push("", "one copy:", "```", item.fragment, "```");
  if (item.fix) out.push("", `suggested fix: ${item.fix}`);
  out.push("", "## Triage", "", `reason: ${entry.reason}`, `plan: ${entry.plan}`);
  return out.join("\n");
}

function summaryMarkdown({ round, report, triage, plan, outcomes }) {
  const verdicts = { real: 0, pedantic: 0, question: 0 };
  for (const t of triage.items) {
    verdicts[t.verdict] += 1;
    if (t.question) verdicts.question += 1;
  }
  const out = [
    `# Cleanup ${round}`,
    "",
    `report at ${report.head ?? "(no head)"}: ${report.items.length} items (${Object.entries(report.sections).map(([k, s]) => `${k} ${s.count}`).join(", ")})`,
    `triage: ${verdicts.real} real (${verdicts.question} waiting on a question), ${verdicts.pedantic} pedantic`,
    "",
    "## Plan",
    "",
    ...plan.map((p, i) => `${i + 1}. \`${p.id}\` ${p.item.title}: ${p.plan}`),
    "",
  ];
  const questions = triage.items.filter((t) => t.question);
  if (questions.length) out.push("## Waiting on a question", "", ...questions.map((t) => `- \`${t.id}\`: ${t.question}`), "");
  if (outcomes.length) {
    out.push("## Outcomes", "", "| item | outcome | gate | verdict | PR | clean $ | eval $ | minutes |", "|---|---|---|---|---|---|---|---|");
    for (const o of outcomes) {
      const minutes = ((o.clean?.durationMs ?? 0) + (o.evaluate?.durationMs ?? 0)) / MINUTE;
      out.push(
        `| \`${o.item}\` | ${o.outcome} | ${o.gate ? (o.gate.pass ? "pass" : "fail") : "-"} | ${o.evaluate?.verdict ?? "-"} | ${o.pr ?? "-"} | ${o.clean?.costUsd?.toFixed(2) ?? "-"} | ${o.evaluate?.costUsd?.toFixed(2) ?? "-"} | ${minutes.toFixed(1)} |`
      );
    }
    out.push("");
  }
  return out.join("\n");
}

/**
 * Runs one round. `io` supplies run(program, args, opts), session(spec), now() and log(line), so tests can stand in for the world.
 */
export async function runRound(opts, io = realIo()) {
  const repo = opts.repo;
  const base = opts.base ?? DEFAULTS.base;
  const round = opts.round;
  const roundDir = path.join(opts.out, round);
  const runsDir = path.join(opts.out, "runs");
  fs.mkdirSync(roundDir, { recursive: true });

  await io.run("git", ["fetch", "--quiet", "origin"], { cwd: repo });
  const shown = await io.run("git", ["show", `${base}:cleanup/config.json`], { cwd: repo });
  const cfg = merge(DEFAULTS, shown.exit === 0 ? JSON.parse(shown.stdout) : {});
  const prBase = cfg.prBase;
  const vars = { base };
  const wtPath = (name) => path.resolve(repo, fill([cfg.worktree.path], { ...vars, name })[0]);
  const gateEnv = Object.fromEntries(Object.entries(cfg.gate.env ?? {}).map(([k, v]) => [k, fill([v], vars)[0]]));

  async function worktree(kind, name) {
    const [program, ...args] = fill(cfg.worktree[kind], { ...vars, name });
    const r = await io.run(program, args, { cwd: repo, timeoutMs: 15 * MINUTE });
    if (r.exit !== 0) throw new Error(`worktree ${kind} ${name} failed: ${tail(r.stderr || r.stdout, 10)}`);
    return wtPath(name);
  }

  async function freshName(id) {
    const stem = `cleanup-${id}`.slice(0, 60);
    for (let n = 1; ; n++) {
      const name = n === 1 ? stem : `${stem}-${n}`;
      if (fs.existsSync(wtPath(name))) continue;
      if ((await io.run("git", ["rev-parse", "--verify", "--quiet", `refs/heads/${name}`], { cwd: repo })).exit === 0) continue;
      if ((await io.run("git", ["ls-remote", "--heads", "origin", name], { cwd: repo })).stdout.trim()) continue;
      return name;
    }
  }

  // The report and the triage read a detached checkout of the base.
  let reportTree = null;
  const reuse = (file) => fs.existsSync(file) && path.resolve(file) !== path.resolve(roundDir, path.basename(file));
  if (opts.reportDir) {
    for (const f of ["report.json", "report.md"]) if (reuse(path.join(opts.reportDir, f))) fs.copyFileSync(path.join(opts.reportDir, f), path.join(roundDir, f));
  }
  const needTree = !opts.reportDir || !opts.triageFile;
  if (needTree) reportTree = await worktree("newDetached", `cleanup-${round}`);

  try {
    if (!opts.reportDir) {
      io.log(`${round}: report on ${base}`);
      const r = await io.run("node", [REPORT_SCRIPT, "--repo", reportTree, "--out", roundDir], { cwd: reportTree, timeoutMs: 15 * MINUTE });
      if (r.exit !== 0) throw new Error(`report failed: ${tail(r.stderr || r.stdout, 10)}`);
      io.log(tail(r.stdout, 5));
    }
    const report = JSON.parse(fs.readFileSync(path.join(roundDir, "report.json"), "utf8"));

    let triage;
    if (opts.triageFile) {
      triage = JSON.parse(fs.readFileSync(opts.triageFile, "utf8"));
      const errors = validateTriage(triage, report);
      if (errors.length) throw new Error(`${opts.triageFile} is invalid: ${errors.slice(0, 5).join("; ")}`);
    } else {
      const t = cfg.sessions.triage;
      let rejected = [];
      for (let attempt = 1; !triage; attempt++) {
        if (attempt > 2) throw new Error(`triage is invalid after 2 sessions: ${rejected.slice(0, 5).join("; ")}`);
        io.log(`${round}: triage session ${attempt} (${t.model}, ${t.effort})`);
        const prompt = [
          brief("triage"),
          "## This round",
          "",
          `The report is ${path.join(roundDir, "report.md")}, with every field in ${path.join(roundDir, "report.json")}.`,
          `The current directory is a read-only checkout of ${base} at ${report.head}. Return the triage as structured output.`,
          ...(rejected.length ? ["", "A previous triage of this report was rejected for:", ...rejected.slice(0, 40).map((e) => `- ${e}`)] : []),
        ].join("\n");
        const s = await io.session({
          kind: "triage",
          cwd: reportTree,
          model: t.model,
          effort: t.effort,
          tools: t.tools,
          schema: triageSchema(report),
          addDirs: [roundDir],
          prompt,
          logFile: path.join(roundDir, "sessions", `triage-${attempt}.jsonl`),
          timeoutMs: t.timeoutMin * MINUTE,
        });
        const candidate = s.structured ?? { items: null };
        rejected = validateTriage(candidate, report);
        if (rejected.length === 0) {
          triage = { round, head: report.head, items: candidate.items, session: { sessionId: s.sessionId, costUsd: s.costUsd, durationMs: s.durationMs, turns: s.turns } };
        } else if (!s.structured) rejected = [`no structured output (exit ${s.exit}, ${s.subtype ?? "no result"})`, ...rejected.slice(0, 3)];
      }
    }
    fs.writeFileSync(path.join(roundDir, "triage.json"), JSON.stringify(triage, null, 2) + "\n");

    const plan = cleaningList(triage, report, opts.items);
    fs.writeFileSync(
      path.join(roundDir, "plan.json"),
      JSON.stringify({ round, head: report.head, items: plan.map((p) => ({ id: p.id, kind: p.item.kind, title: p.item.title, size: p.item.size, reason: p.reason, plan: p.plan })) }, null, 2) + "\n"
    );
    const outcomes = [];
    const writeSummary = () => {
      const md = summaryMarkdown({ round, report, triage, plan, outcomes });
      fs.writeFileSync(path.join(roundDir, "summary.md"), md);
      if (outcomes.length) fs.writeFileSync(path.join(runsDir, `${round}.md`), md);
    };
    writeSummary();
    io.log(`${round}: ${plan.length} items to clean${opts.dryRun ? " (dry run: stopping here)" : ""}`);
    if (opts.dryRun) return { roundDir, plan, outcomes };

    if (reportTree && !opts.keep) {
      await worktree("rm", `cleanup-${round}`);
      reportTree = null;
    }
    fs.mkdirSync(runsDir, { recursive: true });
    for (const entry of plan) {
      const outcome = await cleanItem(entry);
      outcomes.push(outcome);
      fs.appendFileSync(path.join(runsDir, `${round}.jsonl`), JSON.stringify(outcome) + "\n");
      writeSummary();
      io.log(`${round}: ${entry.id} ${outcome.outcome}${outcome.pr ? ` ${outcome.pr}` : ""}`);
    }
    return { roundDir, plan, outcomes };
  } finally {
    if (reportTree && !opts.keep) await worktree("rm", `cleanup-${round}`).catch((e) => io.log(e.message));
  }

  async function cleanItem(entry) {
    const started = io.now();
    const o = {
      ts: started.toISOString(),
      round,
      item: entry.id,
      kind: entry.item.kind,
      title: entry.item.title,
      size: entry.item.size,
      triage: { verdict: entry.verdict, reason: entry.reason, plan: entry.plan },
    };
    const sessionLog = (kind) => path.join(roundDir, "sessions", `${o.branch}.${kind}.jsonl`);
    const pick = (s) => ({ sessionId: s.sessionId, costUsd: s.costUsd, durationMs: s.durationMs, turns: s.turns, exit: s.exit, ...(s.timedOut ? { timedOut: true } : {}) });
    let keepTree = false;
    try {
      o.branch = await freshName(entry.id);
      o.worktree = await worktree("new", o.branch);
      const wt = o.worktree;
      const c = cfg.sessions.clean;
      const clean = await io.session({
        kind: "clean",
        cwd: wt,
        role: c.role,
        model: c.model,
        effort: c.effort,
        schema: CLEANER_SCHEMA,
        addDirs: [roundDir],
        env: gateEnv,
        prompt: [brief("cleaner"), itemBlock(entry), "", `The round's report is ${path.join(roundDir, "report.md")}.`].join("\n"),
        logFile: sessionLog("clean"),
        timeoutMs: c.timeoutMin * MINUTE,
      });
      const said = clean.structured ?? {};
      o.clean = { ...pick(clean), outcome: said.outcome ?? null, subject: said.subject ?? null, changes: said.changes ?? [], behavior: said.behavior ?? null, flags: said.flags ?? [], notes: said.notes ?? null };

      if (!clean.structured) {
        o.outcome = "clean-failed";
        keepTree = true;
        return o;
      }
      const status = await io.run("git", ["status", "--porcelain"], { cwd: wt });
      if (said.outcome === "no-change" || !status.stdout.trim()) {
        o.outcome = "no-change";
        keepTree = Boolean(status.stdout.trim());
        return o;
      }

      const [gp, ...ga] = fill(cfg.gate.run, vars);
      const gate = await io.run(gp, ga, { cwd: wt, env: gateEnv, timeoutMs: cfg.gate.timeoutMin * MINUTE });
      o.gate = { pass: gate.exit === 0, ms: gate.ms, tail: tail(`${gate.stdout}\n${gate.stderr}`, 30) };
      if (!o.gate.pass) {
        o.outcome = "gate-failed";
        keepTree = true;
        return o;
      }

      const subject = /^[a-z]+(\([^)]+\))?!?: \S/.test(said.subject ?? "") ? said.subject : `refactor(cleanup): ${said.subject || entry.item.title}`.slice(0, 100);
      const bullets = (said.changes ?? []).map((ch) => `- ${ch}`);
      const must = async (program, args) => {
        const r = await io.run(program, args, { cwd: wt, timeoutMs: 10 * MINUTE });
        if (r.exit !== 0) throw new Error(`${program} ${args.slice(0, 2).join(" ")} failed: ${tail(r.stderr || r.stdout, 10)}`);
        return r;
      };
      await must("git", ["add", "-A"]);
      await must("git", ["commit", "-m", subject, ...(bullets.length ? ["-m", bullets.join("\n")] : [])]);
      await must("git", ["push", "-u", "origin", o.branch]);
      const body = [
        `- cleaning \`${entry.id}\`: ${entry.item.title}`,
        `- triaged real: ${entry.reason}`,
        ...bullets,
        ...(said.flags?.length ? [`- tuning flags: ${said.flags.join(", ")}`] : []),
        `- keeping behavior: ${said.behavior ?? "(cleaner gave no evidence)"}`,
      ].join("\n");
      const pr = await must("gh", ["pr", "create", "--base", prBase, "--head", o.branch, "--title", subject, "--body", body]);
      o.pr = tail(pr.stdout, 1).trim();

      const diff = (await io.run("git", ["diff", `${base}...HEAD`], { cwd: wt })).stdout;
      const diffFile = path.join(roundDir, `${o.branch}.diff`);
      fs.writeFileSync(diffFile, diff);
      const inline = Buffer.byteLength(diff) <= INLINE_DIFF_BYTES ? diff : `${diff.slice(0, INLINE_DIFF_BYTES)}\n[cut; the whole diff is ${diffFile}]`;
      const e = cfg.sessions.evaluate;
      const evaluation = await io.session({
        kind: "evaluate",
        cwd: wt,
        role: e.role,
        model: e.model,
        effort: e.effort,
        schema: VERDICT_SCHEMA,
        addDirs: [roundDir],
        prompt: [
          brief("evaluator"),
          itemBlock(entry),
          "",
          "## The cleaner's account",
          "",
          ...(said.changes ?? []).map((ch) => `- ${ch}`),
          `behavior: ${said.behavior ?? "(none given)"}`,
          "",
          `## The PR: ${o.pr}`,
          "",
          "```diff",
          inline,
          "```",
        ].join("\n"),
        logFile: sessionLog("evaluate"),
        timeoutMs: e.timeoutMin * MINUTE,
      });
      const v = evaluation.structured ?? {};
      o.evaluate = { ...pick(evaluation), verdict: checkVerdict(evaluation.structured), summary: v.summary ?? null, findings: v.findings ?? [], checked: v.checked ?? [] };

      if (o.evaluate.verdict === "PASS") {
        const merged = await io.run("gh", ["pr", "merge", o.pr, "--merge"], { cwd: wt });
        o.merged = merged.exit === 0;
        o.outcome = o.merged ? "merged" : "merge-failed";
        if (!o.merged) o.error = tail(merged.stderr || merged.stdout, 10);
      } else {
        o.merged = false;
        o.outcome = "left-open";
      }
      return o;
    } catch (err) {
      o.outcome = "error";
      o.error = err.message;
      keepTree = true;
      return o;
    } finally {
      o.finished = io.now().toISOString();
      if (o.worktree && !keepTree && !opts.keep) await worktree("rm", o.branch).catch((e) => (o.cleanupError = e.message));
    }
  }
}

export function realIo() {
  return {
    run: (program, args, opts = {}) => runProgram(program, args, opts),
    session: runSession,
    now: () => new Date(),
    log: (line) => console.log(line),
  };
}

const HELP = `cleanup round: report, triage, and one fresh cleaner and evaluator per real item

  node round.mjs [--repo <main checkout>] [--round <name>] [--out <dir>] [--base <ref>]
                 [--dry-run] [--items <id,id>] [--report <round dir>] [--triage <file>] [--keep]

  --repo     the repo's main checkout (default: the one holding the current directory)
  --round    the round's name (default: round-N, one past the highest in --out)
  --out      where rounds are written (default: <repo>/tmp/cleanup); the round goes to <out>/<round>/
             and each cleaned item's outcome to <out>/runs/<round>.jsonl and .md
  --base     the ref cleanup builds on (default: origin/cleanup); the repo's cleanup/config.json is read from it
  --dry-run  report and triage only
  --items    clean only these triaged-real ids, in this order
  --report   reuse <dir>/report.json instead of making a report
  --triage   reuse a triage file instead of running a triage session
  --keep     keep every worktree`;

function mainCheckout(cwd) {
  const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd, encoding: "utf8" }).trim();
  return path.dirname(common);
}

function nextRound(out) {
  const taken = fs.existsSync(out) ? fs.readdirSync(out).map((d) => /^round-(\d+)$/.exec(d)?.[1]).filter(Boolean).map(Number) : [];
  return `round-${taken.length ? Math.max(...taken) + 1 : 1}`;
}

export function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (a === "--repo") out.repo = path.resolve(next());
    else if (a === "--round") out.round = next();
    else if (a === "--out") out.out = path.resolve(next());
    else if (a === "--base") out.base = next();
    else if (a === "--dry-run") out.dryRun = true;
    else if (a === "--items") out.items = next().split(",").filter(Boolean);
    else if (a === "--report") out.reportDir = path.resolve(next());
    else if (a === "--triage") out.triageFile = path.resolve(next());
    else if (a === "--keep") out.keep = true;
    else if (a === "--help" || a === "-h") out.help = true;
    else throw new Error(`unknown argument ${a}`);
  }
  return out;
}

async function main(argv) {
  const opts = parseArgs(argv);
  if (opts.help) {
    console.log(HELP);
    return 0;
  }
  opts.repo = mainCheckout(opts.repo ?? process.cwd());
  // The repo's gate finds the flag checker through PSTACK_DIR; sessions and their hooks inherit it.
  process.env.PSTACK_DIR ??= PSTACK;
  opts.out ??= path.join(opts.repo, "tmp", "cleanup");
  opts.round ??= nextRound(opts.out);
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => {
      killActive();
      process.exit(130);
    });
  }
  const { roundDir, plan, outcomes } = await runRound(opts);
  console.log(`${opts.round}: ${plan.length} planned, ${outcomes.length} ran; summary ${path.join(roundDir, "summary.md")}`);
  return outcomes.some((o) => o.outcome === "error") ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).then(
    (code) => (process.exitCode = code),
    (e) => {
      process.stderr.write(`cleanup round: ${e.message}\n`);
      process.exitCode = 2;
    }
  );
}
