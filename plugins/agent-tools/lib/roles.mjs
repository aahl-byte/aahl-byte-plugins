// A role is a named list of built-in tools and server tools; this turns one into an MCP config and a claude command line.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadServer } from "./server.mjs";
import { PLUGIN_ROOT } from "./plugins.mjs";

const ROLES_DIR = path.join(PLUGIN_ROOT, "roles");
const SERVER_BIN = path.join(PLUGIN_ROOT, "bin", "server.mjs");
export const PLAYWRIGHT_PLUGIN = path.join(os.homedir(), ".claude/plugins/marketplaces/claude-plugins-official/external_plugins/playwright");

export function roleNames() {
  return fs
    .readdirSync(ROLES_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -".json".length))
    .sort();
}

export function loadRole(name) {
  const file = path.join(ROLES_DIR, `${name}.json`);
  if (!fs.existsSync(file)) throw new Error(`no role ${name}; roles are ${roleNames().join(", ")}`);
  return { name, ...JSON.parse(fs.readFileSync(file, "utf8")) };
}

/** The official Playwright plugin's own server entry, with flags that keep the browser on the worktree's app. */
function playwrightServer(pluginDir, port) {
  const file = path.join(pluginDir, ".mcp.json");
  if (!fs.existsSync(file)) throw new Error(`the Playwright plugin is not installed (no ${file}); install playwright from claude-plugins-official`);
  const entry = JSON.parse(fs.readFileSync(file, "utf8")).playwright;
  return { type: "stdio", command: entry.command, args: [...entry.args, "--headless", "--isolated", "--allowed-origins", `http://localhost:${port}`] };
}

export async function resolveRole(role, { cwd, port, playwrightPlugin = PLAYWRIGHT_PLUGIN, node = process.execPath }) {
  const builtins = role.builtins ?? [];
  const allowedTools = [...builtins];
  const mcpServers = {};
  for (const [server, tools] of Object.entries(role.servers ?? {})) {
    const available = new Set((await loadServer(server)).map((t) => t.name));
    for (const t of tools) if (!available.has(t)) throw new Error(`role ${role.name}: ${server} has no tool ${t}`);
    mcpServers[server] = { type: "stdio", command: node, args: [SERVER_BIN, server, "--cwd", cwd, "--only", tools.join(",")], env: { AGENT_TOOLS_ROLE: role.name } };
    allowedTools.push(...tools.map((t) => `mcp__${server}__${t}`));
  }
  let appendSystemPrompt;
  if (role.playwright) {
    if (!port) throw new Error(`role ${role.name} needs the worktree's port; add e2e.port to .claude/agent-tools.json`);
    mcpServers.playwright = playwrightServer(playwrightPlugin, port);
    allowedTools.push("mcp__playwright");
    appendSystemPrompt = `The app under test runs at http://localhost:${port}; point the Playwright browser tools there. The browser is refused other origins.`;
  }
  return { name: role.name, builtins, allowedTools, mcpServers, appendSystemPrompt };
}

/** The headless claude arguments for a resolved role: only its built-ins, only its MCP servers, everything else denied. */
export function claudeArgs(resolved, { model, effort, rest = [] }) {
  return [
    "-p",
    "--tools",
    resolved.builtins.join(","),
    "--strict-mcp-config",
    "--mcp-config",
    JSON.stringify({ mcpServers: resolved.mcpServers }),
    "--allowedTools",
    resolved.allowedTools.join(","),
    "--permission-mode",
    "dontAsk",
    ...(model ? ["--model", model] : []),
    ...(effort ? ["--effort", effort] : []),
    ...(resolved.appendSystemPrompt ? ["--append-system-prompt", resolved.appendSystemPrompt] : []),
    ...rest,
  ];
}
