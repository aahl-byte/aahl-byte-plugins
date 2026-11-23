// A repo's own values (gate command, test runner, e2e config, port lookup) from .claude/agent-tools.json.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const CONFIG_FILE = ".claude/agent-tools.json";

/** The checkout's own file, else the main checkout's (a fresh worktree may predate the file). */
export function configPath(cwd, env = process.env) {
  if (env.AGENT_TOOLS_CONFIG) return env.AGENT_TOOLS_CONFIG;
  const own = path.join(cwd, CONFIG_FILE);
  if (fs.existsSync(own)) return own;
  try {
    const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    const main = path.join(path.dirname(common), CONFIG_FILE);
    if (fs.existsSync(main)) return main;
  } catch {}
  return own;
}

export function loadProjectConfig(cwd, env = process.env) {
  const file = configPath(cwd, env);
  if (!fs.existsSync(file)) return {};
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** config[a][b]..., or an error naming the missing key and the file it belongs in. */
export function need(config, dotted) {
  const value = dotted.split(".").reduce((o, k) => o?.[k], config);
  if (value === undefined) throw new Error(`no "${dotted}" in ${CONFIG_FILE}; add it there (see the agent-tools README)`);
  return value;
}

/** Fills {worktree} and {cwd} in each argv element. */
export function fill(argv, cwd) {
  const vars = { worktree: path.basename(cwd), cwd };
  return argv.map((a) => a.replace(/\{(worktree|cwd)\}/g, (_, k) => vars[k]));
}
