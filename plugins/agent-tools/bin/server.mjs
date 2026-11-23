#!/usr/bin/env node
// Starts one agent-tools MCP server on stdio: server.mjs <server> [--cwd <dir>] [--only A,B].
import path from "node:path";
import { serve } from "../lib/server.mjs";

export const meta = {
  why: "One entry point for every agent-tools server, so a role's MCP config names a server and its tools, never a script per tool.",
  layer: "type",
  takes: ["typed-tools"],
};

function parse(argv) {
  const out = { server: argv[0], cwd: process.cwd(), only: [] };
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === "--cwd") out.cwd = path.resolve(argv[++i]);
    else if (argv[i] === "--only") out.only = argv[++i].split(",").filter(Boolean);
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  if (!out.server) throw new Error("usage: server.mjs <server> [--cwd <dir>] [--only Tool,Tool]");
  return out;
}

try {
  await serve(parse(process.argv.slice(2)));
} catch (e) {
  process.stderr.write(`agent-tools: ${e.message}\n`);
  process.exit(1);
}
