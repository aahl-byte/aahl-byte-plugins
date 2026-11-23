// One JSON line per tool call, so what agents ran and what they asked for is data.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const MAX_ARG_CHARS = 500;

export function ledgerPath(env = process.env) {
  if (env.AGENT_TOOLS_LEDGER) return env.AGENT_TOOLS_LEDGER;
  const state = env.XDG_STATE_HOME || path.join(env.HOME || os.homedir(), ".local", "state");
  return path.join(state, "agent-tools", "ledger.jsonl");
}

function clip(value) {
  if (typeof value === "string") return value.length > MAX_ARG_CHARS ? `${value.slice(0, MAX_ARG_CHARS)}…[${value.length} chars]` : value;
  if (Array.isArray(value)) return value.map(clip);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clip(v)]));
  return value;
}

export function appendLedger(file, entry) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `${JSON.stringify({ ...entry, args: clip(entry.args) })}\n`);
  } catch (e) {
    process.stderr.write(`agent-tools: could not write the ledger at ${file}: ${e.message}\n`);
  }
}
