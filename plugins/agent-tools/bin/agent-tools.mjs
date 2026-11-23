#!/usr/bin/env node
// agent-tools: run a headless claude session locked to one role's typed tools, or list roles and tools.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const meta = {
  why: "Builds the one restricted claude command line for a role, so every headless session gets exactly its tools and no shell.",
  layer: "type",
  takes: ["typed-tools"],
};

const ROOT = path.resolve(import.meta.dirname, "..");

const HELP = `agent-tools: headless claude sessions with typed tools and no shell

  agent-tools run --role <role> --cwd <dir> --model <m> --effort <e> [--dry-run] [-- <claude args>...]
      Runs claude -p in <dir> with only the role's built-in tools and MCP tools.
      Everything after -- goes to claude as-is: the prompt, --output-format, --max-budget-usd.
      --dry-run prints the command instead of running it.
  agent-tools roles          each role and the tools it grants
  agent-tools tools          each server's tools, with why

Roles: roles/*.json. Servers: servers/<name>/, one tool per file.
Project values (gate, tests, e2e, port) come from <dir>/.claude/agent-tools.json.
Each tool call appends a line to $AGENT_TOOLS_LEDGER (default ~/.local/state/agent-tools/ledger.jsonl).`;

/** The SDK and zod are installed on first use, from the pinned lockfile. */
function ensureDeps() {
  if (fs.existsSync(path.join(ROOT, "node_modules", "@modelcontextprotocol", "sdk"))) return;
  const r = spawnSync("npm", ["ci", "--omit=dev", "--no-audit", "--no-fund"], { cwd: ROOT, stdio: ["ignore", "inherit", "inherit"] });
  if (r.status !== 0) throw new Error(`npm ci failed in ${ROOT}`);
}

function parseRun(argv) {
  const out = { rest: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (a === "--") {
      out.rest = argv.slice(i + 1);
      break;
    } else if (a === "--role") out.role = next();
    else if (a === "--cwd") out.cwd = path.resolve(next());
    else if (a === "--model") out.model = next();
    else if (a === "--effort") out.effort = next();
    else if (a === "--dry-run") out.dryRun = true;
    else throw new Error(`unknown argument ${a}`);
  }
  for (const k of ["role", "cwd", "model", "effort"]) if (!out[k]) throw new Error(`run needs --${k}`);
  return out;
}

const quote = (s) => (/^[A-Za-z0-9_./:=@,+-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`);

async function portFor(cwd) {
  const { loadProjectConfig, fill } = await import("../lib/config.mjs");
  const { runSpec } = await import("../lib/exec.mjs");
  const cmd = loadProjectConfig(cwd).e2e?.port;
  if (!cmd) return undefined;
  const [program, ...args] = fill(cmd, cwd);
  const r = await runSpec({ program, args, cwd, timeoutMs: 30_000 });
  const port = r.stdout.trim();
  return r.exit === 0 && /^\d+$/.test(port) ? port : undefined;
}

async function run(argv) {
  const opts = parseRun(argv);
  ensureDeps();
  const { loadRole, resolveRole, claudeArgs } = await import("../lib/roles.mjs");
  const role = loadRole(opts.role);
  const port = role.playwright ? await portFor(opts.cwd) : undefined;
  const resolved = await resolveRole(role, { cwd: opts.cwd, port });
  const args = claudeArgs(resolved, opts);
  if (opts.dryRun) {
    process.stdout.write(`cd ${quote(opts.cwd)} && claude ${args.map(quote).join(" ")}\n`);
    return 0;
  }
  const r = spawnSync("claude", args, { cwd: opts.cwd, stdio: "inherit", env: { ...process.env, AGENT_TOOLS_ROLE: role.name } });
  return r.status ?? 1;
}

async function roles() {
  const { loadRole, roleNames } = await import("../lib/roles.mjs");
  for (const name of roleNames()) {
    const r = loadRole(name);
    console.log(`${name}: ${r.description}`);
    console.log(`  built-in: ${r.builtins.join(", ")}`);
    for (const [server, tools] of Object.entries(r.servers)) console.log(`  ${server}: ${tools.join(", ")}`);
    if (r.playwright) console.log("  playwright: the official plugin's browser tools, on the worktree's port");
  }
  return 0;
}

async function tools() {
  const { loadServer, serverNames } = await import("../lib/server.mjs");
  for (const server of serverNames()) {
    console.log(server);
    for (const t of await loadServer(server)) console.log(`  ${t.name}${t.readOnly ? "" : t.outward ? " (outward)" : " (writes)"}: ${t.meta.why}`);
  }
  return 0;
}

const [cmd, ...rest] = process.argv.slice(2);
try {
  if (cmd === "run") process.exitCode = await run(rest);
  else if (cmd === "roles") process.exitCode = (ensureDeps(), await roles());
  else if (cmd === "tools") process.exitCode = (ensureDeps(), await tools());
  else {
    console.log(HELP);
    process.exitCode = cmd && cmd !== "help" && cmd !== "--help" && cmd !== "-h" ? 2 : 0;
  }
} catch (e) {
  process.stderr.write(`agent-tools: ${e.message}\n`);
  process.exitCode = 2;
}
