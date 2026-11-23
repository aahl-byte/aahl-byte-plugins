// Runs programs and headless claude sessions for a round: each in its own process group, killed by PID on timeout.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PLUGINS = path.resolve(import.meta.dirname, "..", "..", "..", "..");
const active = new Set();

/** Kills every running child's process group by its PID; used on SIGINT and SIGTERM. */
export function killActive(signal = "SIGTERM") {
  for (const child of active) {
    try {
      process.kill(-child.pid, signal);
    } catch {}
  }
}

/** Runs one program with an argv array, no shell. Output goes to `logFile` when given, else is captured. */
export function runProgram(program, args, { cwd, env, stdin, timeoutMs = 30 * 60 * 1000, logFile } = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const out = [];
    const err = [];
    const log = logFile ? fs.createWriteStream(logFile) : null;
    let child;
    try {
      child = spawn(program, args, { cwd, env: { ...process.env, ...env }, stdio: ["pipe", "pipe", "pipe"], detached: true });
    } catch (e) {
      resolve({ exit: null, stdout: "", stderr: e.message, ms: 0 });
      return;
    }
    active.add(child);
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {}
    }, timeoutMs);
    child.stdout.on("data", (d) => (log ? log.write(d) : out.push(d)));
    child.stderr.on("data", (d) => err.push(d));
    child.on("error", (e) => err.push(Buffer.from(e.message)));
    child.on("close", (code) => {
      clearTimeout(timer);
      active.delete(child);
      const finish = () =>
        resolve({ exit: code, timedOut, stdout: Buffer.concat(out).toString("utf8"), stderr: Buffer.concat(err).toString("utf8"), ms: Date.now() - start });
      if (log) log.end(finish);
      else finish();
    });
    child.stdin.on("error", () => {});
    child.stdin.end(stdin ?? "");
  });
}

/** agent-tools beside this plugin: the same repo or marketplace clone, else the newest cached version. */
export function agentToolsDir(env = process.env) {
  if (env.AGENT_TOOLS_DIR) return env.AGENT_TOOLS_DIR;
  const isPlugin = (d) => fs.existsSync(path.join(d, ".claude-plugin", "plugin.json"));
  const sibling = path.join(PLUGINS, "agent-tools");
  if (isPlugin(sibling)) return sibling;
  const cached = path.resolve(PLUGINS, "..", "agent-tools");
  if (fs.existsSync(cached)) {
    const versions = fs
      .readdirSync(cached)
      .map((v) => path.join(cached, v))
      .filter(isPlugin)
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    if (versions.length) return versions[0];
  }
  throw new Error(`agent-tools is not installed next to pstack (looked in ${sibling} and ${cached}); set AGENT_TOOLS_DIR`);
}

/** The command for a session: a role's restricted command line through agent-tools, or claude with only the listed built-in tools. */
export function sessionCommand(s) {
  const tail = [
    "--output-format",
    "stream-json",
    "--verbose",
    ...(s.schema ? ["--json-schema", JSON.stringify(s.schema)] : []),
    ...(s.addDirs ?? []).flatMap((d) => ["--add-dir", d]),
  ];
  if (s.role) {
    const bin = path.join(agentToolsDir(), "bin", "agent-tools.mjs");
    return { program: process.execPath, args: [bin, "run", "--role", s.role, "--cwd", s.cwd, "--model", s.model, "--effort", s.effort, "--", ...tail] };
  }
  const tools = s.tools.join(",");
  return {
    program: "claude",
    args: ["-p", "--tools", tools, "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}', "--allowedTools", tools, "--permission-mode", "dontAsk", "--model", s.model, "--effort", s.effort, ...tail],
  };
}

/** The last `result` event of a stream-json log: structured output, cost, time, turns and session id. */
export function sessionResult(logFile) {
  const lines = fs.existsSync(logFile) ? fs.readFileSync(logFile, "utf8").split("\n") : [];
  for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i].startsWith("{")) continue;
    let event;
    try {
      event = JSON.parse(lines[i]);
    } catch {
      continue;
    }
    if (event.type !== "result") continue;
    return {
      structured: event.structured_output ?? null,
      result: event.result ?? null,
      costUsd: event.total_cost_usd ?? null,
      durationMs: event.duration_ms ?? null,
      turns: event.num_turns ?? null,
      sessionId: event.session_id ?? null,
      isError: Boolean(event.is_error),
      subtype: event.subtype ?? null,
    };
  }
  return { structured: null, result: null, costUsd: null, durationMs: null, turns: null, sessionId: null, isError: true, subtype: "no-result" };
}

/** Runs one fresh session with its prompt on stdin, logging stream-json to s.logFile. */
export async function runSession(s) {
  fs.mkdirSync(path.dirname(s.logFile), { recursive: true });
  const { program, args } = sessionCommand(s);
  const r = await runProgram(program, args, { cwd: s.cwd, env: s.env, stdin: s.prompt, timeoutMs: s.timeoutMs, logFile: s.logFile });
  return { exit: r.exit, timedOut: r.timedOut, stderr: r.stderr.slice(-2000), ...sessionResult(s.logFile) };
}
