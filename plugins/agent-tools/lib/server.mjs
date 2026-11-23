// An MCP stdio server made from the tool files in servers/<name>/, one tool per file.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { inputSchema } from "./tool.mjs";
import { callTool } from "./call.mjs";
import { loadProjectConfig } from "./config.mjs";
import { runSpec } from "./exec.mjs";
import { ledgerPath } from "./ledger.mjs";
import { PLUGIN_ROOT, pluginDir } from "./plugins.mjs";

const SERVERS_DIR = path.join(PLUGIN_ROOT, "servers");

export function serverNames() {
  return fs
    .readdirSync(SERVERS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

export function toolFiles(server) {
  const dir = path.join(SERVERS_DIR, server);
  if (!fs.existsSync(dir)) throw new Error(`no server named ${server}; servers are ${serverNames().join(", ")}`);
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mjs"))
    .sort()
    .map((f) => path.join(dir, f));
}

export async function loadServer(server) {
  const tools = [];
  for (const file of toolFiles(server)) tools.push((await import(pathToFileURL(file))).default);
  return tools;
}

/** The named tools in the order given, or every tool when only is empty. */
export function pickTools(server, tools, only) {
  if (!only?.length) return tools;
  return only.map((name) => {
    const tool = tools.find((t) => t.name === name);
    if (!tool) throw new Error(`${server} has no tool ${name}; it has ${tools.map((t) => t.name).join(", ")}`);
    return tool;
  });
}

export function listing(tool) {
  const { $schema, ...schema } = z.toJSONSchema(inputSchema(tool));
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: schema,
    annotations: { readOnlyHint: Boolean(tool.readOnly), openWorldHint: Boolean(tool.outward) },
  };
}

export async function serve({ server, cwd, only, env = process.env }) {
  const tools = pickTools(server, await loadServer(server), only);
  const ctx = {
    cwd,
    config: loadProjectConfig(cwd, env),
    env,
    ledger: ledgerPath(env),
    server,
    role: env.AGENT_TOOLS_ROLE,
    run: (spec) => runSpec({ cwd, ...spec }),
    pluginDir,
  };
  const mcp = new Server({ name: `agent-tools-${server}`, version: "0.1.0" }, { capabilities: { tools: {} } });
  mcp.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: tools.map(listing) }));
  mcp.setRequestHandler(CallToolRequestSchema, async (req) => {
    const tool = tools.find((t) => t.name === req.params.name);
    if (!tool) return { content: [{ type: "text", text: `no tool ${req.params.name} on ${server}` }], isError: true };
    const { text, isError } = await callTool(tool, req.params.arguments, ctx);
    return { content: [{ type: "text", text }], isError };
  });
  await mcp.connect(new StdioServerTransport());
}
