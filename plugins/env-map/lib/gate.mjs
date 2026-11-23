// env-map check: every part we own says why it exists, which layer holds it and which listed jobs it takes.
import os from "node:os";
import path from "node:path";
import { loadConfig } from "./config.mjs";

export const PART_KINDS = new Set(["script", "rule", "githook", "skill", "agent", "claude-md", "memory"]);

/** responsibilities.yaml: one `id: description` per line; `#` starts a comment. */
export function parseResponsibilities(text) {
  const jobs = new Map();
  for (const line of text.split(/\r?\n/)) {
    const m = /^([a-z0-9][a-z0-9-]*):\s*(.*?)\s*$/.exec(line);
    if (m) jobs.set(m[1], m[2]);
  }
  return jobs;
}

function whereFor(box) {
  if (box.kind === "rule") return `rule ${box.label} in the RULES array of ${path.basename(box.file)}`;
  if (box.kind === "script") return /\.(mjs|cjs|js|ts)$/.test(box.file) ? "export const meta" : "a `# why:` header comment";
  if (box.kind === "githook") return "a `# why:` header comment";
  return "the frontmatter";
}

export function runGate(graph, { responsibilities, config = loadConfig() }) {
  const repo = graph.roots.find((r) => r.label === "repo")?.path;
  const home = os.homedir();
  const display = (file) =>
    repo && file?.startsWith(`${repo}/`) ? path.relative(repo, file) : file?.startsWith(`${home}/`) ? `~${file.slice(home.length)}` : file ?? "";
  const failures = [];
  const fail = (box, field, text) => {
    const file = display(box.file);
    failures.push({ box: box.id, file, field, message: `${file}: ${text}` });
  };
  const missingWhy = { ours: 0, external: 0 };
  const missingLayer = { ours: 0, external: 0 };
  const missingTakes = { ours: 0, external: 0 };

  for (const box of graph.boxes) {
    if (box.kind === "hook" && box.owner === "ours" && box.inline) {
      fail(box, "command", `${box.event} hook "${box.command}" is inline; move it into a script file and call that file`);
    }
    if (!PART_KINDS.has(box.kind)) continue;
    const owner = box.owner === "ours" ? "ours" : "external";
    const hasTakes = Array.isArray(box.takes) && box.takes.length > 0;
    if (!box.why) missingWhy[owner]++;
    if (!box.layer) missingLayer[owner]++;
    if (!hasTakes) missingTakes[owner]++;
    if (owner !== "ours") continue;
    const where = whereFor(box);
    if (!box.why) fail(box, "why", `${box.label} has no why; add it to ${where}`);
    if (!box.layer) fail(box, "layer", `${box.label} has no layer; add it to ${where}`);
    else if (!config.layers.includes(box.layer)) fail(box, "layer", `${box.label} layer "${box.layer}" is not one of ${config.layers.join(" | ")}`);
    if (!hasTakes) fail(box, "takes", `${box.label} has no takes; add it to ${where}`);
    for (const id of hasTakes ? box.takes : []) {
      if (!responsibilities.has(id)) fail(box, "takes", `${box.label} takes "${id}" is not in responsibilities.yaml; add a line for it there`);
    }
  }
  failures.sort((a, b) => (a.file + a.box + a.field < b.file + b.box + b.field ? -1 : 1));
  const unreadable = graph.sources.filter((s) => s.status === "error").map((s) => `${display(s.path)}: ${s.error}`);
  return { ok: failures.length === 0, failures, missingWhy, missingLayer, missingTakes, unreadable };
}

export function formatGate(result) {
  const lines = result.failures.map((f) => `FAIL ${f.message}`);
  for (const u of result.unreadable) lines.push(`UNREADABLE ${u}`);
  const pair = (c) => `${c.ours} ours, ${c.external} external`;
  lines.push(
    "",
    `parts missing why: ${pair(result.missingWhy)}`,
    `parts missing layer: ${pair(result.missingLayer)}`,
    `parts missing takes: ${pair(result.missingTakes)}`,
    "External parts are counted, never gated.",
    result.ok ? "env-map check: pass" : `env-map check: ${result.failures.length} failures in parts we own`
  );
  return `${lines.join("\n")}\n`;
}
