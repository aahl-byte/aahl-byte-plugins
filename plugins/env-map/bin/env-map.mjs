#!/usr/bin/env node
// env-map: draw every part of the agent environment that acts on a session, and check that each part we own explains itself.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadConfig } from "../lib/config.mjs";
import { discoverConfigDirs } from "../lib/collect/index.mjs";
import { mapEnvironment } from "../lib/map.mjs";
import { toJson } from "../lib/graph.mjs";
import { renderPage } from "../lib/render.mjs";
import { buildBaselines, loadSnapshots, writeSnapshot } from "../lib/baselines.mjs";
import { runGate, formatGate, parseResponsibilities } from "../lib/gate.mjs";

export const meta = {
  why: "One entry point for the map and the gate, so the SessionStart hook and a person run the same code.",
  layer: "verify",
  takes: ["environment-map"],
};

const HELP = `env-map: a deterministic map of the agent environment

  env-map map   [--root <project>] [--compare <git ref>]...
      Writes <project>/.claude/env-map/graph.json, index.html and a dated snapshot.
      --compare adds a git-ref baseline to the page's Compare picker (repeatable).
  env-map check [--root <project>] [--responsibilities <file>]
      Fails (exit 1) when a part we own has an inline hook command, no why, layer
      or takes, a layer outside the list, or a takes id missing from
      responsibilities.yaml. Counts parts missing a why, ours and external.

  --root        project directory (default: $CLAUDE_PROJECT_DIR, else the current directory)
  --home        home directory used for ~ (default: the user's home)
  --config-dir  global config dir to read (repeatable; default: $CLAUDE_CONFIG_DIR,
                ~/.claude and any dir installed plugin paths sit under)

Exit codes: 0 ok, 1 check failed or map errored, 2 usage.`;

function parseArgs(argv) {
  const args = { cmd: argv[0], compare: [], configDirs: [] };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${a} needs a value`);
      return argv[++i];
    };
    if (a === "--root") args.root = next();
    else if (a === "--home") args.home = next();
    else if (a === "--config-dir") args.configDirs.push(next());
    else if (a === "--compare") args.compare.push(next());
    else if (a === "--responsibilities") args.responsibilities = next();
    else if (a === "-h" || a === "--help") args.cmd = "help";
    else throw new Error(`unknown argument: ${a}`);
  }
  return args;
}

function environment(args) {
  const root = path.resolve(args.root ?? process.env.CLAUDE_PROJECT_DIR ?? process.cwd());
  const home = path.resolve(args.home ?? os.homedir());
  const configDirs = args.configDirs.length ? args.configDirs.map((d) => path.resolve(d)) : discoverConfigDirs(process.env, home).map((d) => d.path);
  return { root, home, configDirs, config: loadConfig() };
}

function map(args) {
  const env = environment(args);
  const graph = mapEnvironment(env);
  const json = toJson(graph);
  const out = path.join(env.root, ".claude", "env-map");
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, ".gitignore"), "*\n");
  fs.writeFileSync(path.join(out, "graph.json"), json);
  const now = new Date();
  writeSnapshot(out, json, now.toISOString().slice(0, 10));
  const baselines = buildBaselines({ ...env, current: graph, refs: args.compare, daysBack: env.config.compareDaysBack, snapshots: loadSnapshots(out) });
  const html = renderPage({ graph, baselines, generatedAt: now.toISOString(), project: path.basename(env.root), config: env.config });
  const tmp = path.join(out, `.index.html.${process.pid}`);
  fs.writeFileSync(tmp, html);
  fs.renameSync(tmp, path.join(out, "index.html"));
  const unreadable = graph.sources.filter((s) => s.status === "error").length;
  process.stdout.write(
    `env-map: wrote ${path.join(out, "index.html")} (${graph.boxes.length} boxes, ${graph.flags.length} flags, ${baselines.length} baselines${unreadable ? `, ${unreadable} unreadable sources` : ""})\n`
  );
  return 0;
}

function check(args) {
  const env = environment(args);
  const file = args.responsibilities ?? new URL("../responsibilities.yaml", import.meta.url);
  const result = runGate(mapEnvironment(env), { responsibilities: parseResponsibilities(fs.readFileSync(file, "utf8")), config: env.config });
  process.stdout.write(formatGate(result));
  return result.ok ? 0 : 1;
}

let args;
try {
  args = parseArgs(process.argv.slice(2));
} catch (e) {
  process.stderr.write(`${e.message}\n\n${HELP}\n`);
  process.exit(2);
}
if (args.cmd === "help" || args.cmd === undefined) {
  process.stdout.write(`${HELP}\n`);
  process.exit(args.cmd === "help" ? 0 : 2);
}
const commands = { map, check };
if (!commands[args.cmd]) {
  process.stderr.write(`unknown command: ${args.cmd}\n\n${HELP}\n`);
  process.exit(2);
}
try {
  process.exit(commands[args.cmd](args));
} catch (e) {
  process.stderr.write(`env-map ${args.cmd} failed: ${e.stack ?? e.message}\n`);
  process.exit(1);
}
