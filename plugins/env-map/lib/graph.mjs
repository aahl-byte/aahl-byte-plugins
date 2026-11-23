// Turns collected parts into the graph: event boxes, resolved enforcer and name edges, owners, git facts, reach and blast radius.
import path from "node:path";
import { computeFlags } from "./flags.mjs";

const BLAST_FORWARD = new Set(["calls", "contains", "enforces"]);
const BLAST_BACKWARD = new Set(["names"]);
const REACH_BACKWARD = new Set(["fires", "calls", "contains"]);
const FILE_FACT_KINDS = new Set(["script", "githook", "claude-md", "skill", "agent", "memory"]);

const byKey = (...keys) => (a, b) => {
  for (const k of keys) {
    if (a[k] < b[k]) return -1;
    if (a[k] > b[k]) return 1;
  }
  return 0;
};

/** Resolves a CLAUDE.md row's enforcer tokens to boxes, or to repo files when no box matches. */
function resolveEnforcers(row, boxes, repoFiles) {
  const found = new Set();
  let files = 0;
  for (const raw of row.tokens ?? []) {
    const token = raw.trim().split(/\s+/)[0];
    const rule = boxes.find((b) => b.kind === "rule" && b.root === "repo" && b.id.endsWith(`#${token}`));
    const script = boxes.find((b) => b.kind === "script" && b.root === "repo" && (b.source === `repo:${token}` || b.label === token));
    const githook = boxes.find((b) => b.kind === "githook" && b.label === token);
    const hit = rule ?? script ?? githook;
    if (hit) found.add(hit.id);
    else if (repoFiles.some((f) => f === token || f.endsWith(`/${token}`) || path.basename(f).startsWith(`${token}.`))) files++;
  }
  for (const name of row.githooks ?? []) {
    const githook = boxes.find((b) => b.kind === "githook" && b.label === name);
    if (githook) found.add(githook.id);
  }
  for (const id of [...found]) {
    if (id.startsWith("script:") && [...found].some((r) => r.startsWith(`rule:${id.slice("script:".length)}#`))) found.delete(id);
  }
  return { ids: [...found].sort(), enforced: found.size > 0 || files > 0 };
}

function walk(start, adjacency) {
  const seen = new Set();
  const stack = [start];
  while (stack.length) {
    for (const next of adjacency.get(stack.pop()) ?? []) {
      if (!seen.has(next) && next !== start) {
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return seen;
}

export function buildGraph(collected, { config, history }) {
  const roots = new Map(collected.roots.map((r) => [r.label, r]));
  const boxes = [];
  const ids = new Set();
  for (const b of collected.boxes) {
    if (ids.has(b.id)) continue;
    ids.add(b.id);
    boxes.push({ ...b });
  }
  const edges = [...collected.edges];

  // Events.
  const order = new Map(config.events.map(([name, label], i) => [name, { label, i }]));
  for (const e of edges) {
    if (!e.from.startsWith("event:") || ids.has(e.from)) continue;
    const name = e.from.slice("event:".length);
    ids.add(e.from);
    boxes.push({ id: e.from, kind: "event", event: name, label: order.get(name)?.label ?? name, order: order.get(name)?.i ?? config.events.length });
  }

  // CLAUDE.md rows to their enforcers.
  for (const row of boxes.filter((b) => b.kind === "row")) {
    const { ids: enforcers, enforced } = resolveEnforcers(row, boxes, collected.repoFiles ?? []);
    for (const from of enforcers) edges.push({ from, to: row.id, kind: "enforces" });
    row.enforced = enforced;
    delete row.tokens;
    delete row.githooks;
  }

  // Skills and agents to the plugin:name ids they mention.
  const named = new Map(boxes.filter((b) => (b.kind === "skill" || b.kind === "agent") && b.label.includes(":")).map((b) => [b.label, b.id]));
  for (const b of boxes) {
    for (const m of b.mentions ?? []) {
      const to = named.get(m);
      if (to && to !== b.id) edges.push({ from: b.id, to, kind: "names" });
    }
    delete b.mentions;
  }

  // Owner, origin, version and git facts.
  for (const b of boxes) {
    if (b.kind === "event") continue;
    const r = roots.get(b.root);
    b.owner = r?.owner ?? "external";
    b.origin = r?.origin ?? "file";
    if (r?.version) b.version = r.version;
    if (typeof b.takes === "string") b.takes = [b.takes];
    if (b.root === "repo" && b.file && FILE_FACT_KINDS.has(b.kind)) {
      const fact = history.files[path.relative(roots.get("repo").path, b.file)];
      if (fact) b.git = fact;
    }
  }

  // Reach (events upstream) and blast radius (what goes unchecked downstream).
  const unique = new Map();
  for (const e of edges) if (e.to && ids.has(e.from) && ids.has(e.to)) unique.set(`${e.from}\0${e.to}\0${e.kind}`, e);
  const finalEdges = [...unique.values()].sort(byKey("from", "to", "kind"));
  const blastAdj = new Map();
  const reachAdj = new Map();
  const link = (map, a, b) => (map.get(a) ?? map.set(a, []).get(a)).push(b);
  for (const e of finalEdges) {
    if (BLAST_FORWARD.has(e.kind)) link(blastAdj, e.from, e.to);
    if (BLAST_BACKWARD.has(e.kind)) link(blastAdj, e.to, e.from);
    if (REACH_BACKWARD.has(e.kind)) link(reachAdj, e.to, e.from);
  }
  for (const b of boxes) {
    if (b.kind === "event") continue;
    const blast = [...walk(b.id, blastAdj)].sort();
    const reach = [...walk(b.id, reachAdj)].filter((id) => id.startsWith("event:")).sort();
    if (blast.length) b.blast = blast;
    if (reach.length) b.reach = reach;
  }

  const graph = {
    version: 1,
    asOf: history.asOf ?? null,
    configDirs: collected.configDirs,
    roots: collected.roots.map((r) => ({ ...r })).sort(byKey("label")),
    sources: collected.sources.map((s) => ({ ...s })).sort(byKey("id")),
    boxes: boxes.sort(byKey("id")),
    edges: finalEdges,
  };
  graph.flags = computeFlags(graph, config);
  const flagsByBox = new Map();
  for (const f of graph.flags) link(flagsByBox, f.box, f.flag);
  for (const b of graph.boxes) if (flagsByBox.has(b.id)) b.flags = [...new Set(flagsByBox.get(b.id))].sort();
  return graph;
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((k) => value[k] !== undefined)
        .map((k) => [k, sortKeys(value[k])])
    );
  }
  return value;
}

/** graph.json text: sorted keys, two-space indent, trailing newline. */
export function toJson(graph) {
  return `${JSON.stringify(sortKeys(graph), null, 2)}\n`;
}
