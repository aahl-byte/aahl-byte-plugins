// Baselines for Compare: the repo at a git ref (or N days before HEAD), and dated snapshots of earlier runs.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { gitReader } from "./readers.mjs";
import { mapEnvironment } from "./map.mjs";
import { toJson } from "./graph.mjs";

const DAY = 86400000;

function git(root, args) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

/** Keeps one snapshot per day: a later run on the same day replaces it. */
export function writeSnapshot(outDir, json, date) {
  const dir = path.join(outDir, "snapshots");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${date}.json`), json);
}

export function loadSnapshots(outDir) {
  const dir = path.join(outDir, "snapshots");
  let names = [];
  try {
    names = fs.readdirSync(dir).filter((n) => /^\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort();
  } catch {
    return [];
  }
  const out = [];
  for (const name of names) {
    try {
      out.push({ date: name.slice(0, 10), json: fs.readFileSync(path.join(dir, name), "utf8") });
    } catch {
      // An unreadable snapshot is skipped; the next run rewrites today's.
    }
  }
  return out;
}

const slim = (graph) => ({
  boxes: graph.boxes.map(({ id, kind, label, owner, root, layer, takes, event, matcher }) => ({ id, kind, label, owner, root, layer, takes, event, matcher })),
  edges: graph.edges,
});

function atRef({ root, home, configDirs, config, snapshots }, ref, label) {
  const sha = git(root, ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
  if (!sha) return null;
  const date = git(root, ["log", "-1", "--format=%cI", sha]).slice(0, 10);
  const graph = mapEnvironment({ root, home, configDirs, config, reader: gitReader(root, sha) });
  const snap = [...snapshots].reverse().find((s) => s.date <= date);
  if (snap) {
    const old = JSON.parse(snap.json);
    const keepRepo = (b) => b.root === "repo" || b.kind === "event";
    graph.boxes = [...graph.boxes.filter(keepRepo), ...old.boxes.filter((b) => !keepRepo(b))];
    const ids = new Set(graph.boxes.map((b) => b.id));
    const edges = new Map([...graph.edges, ...old.edges].filter((e) => ids.has(e.from) && ids.has(e.to)).map((e) => [`${e.from}\0${e.to}\0${e.kind}`, e]));
    graph.edges = [...edges.values()];
  }
  return { sha, kind: "git", id: `git:${sha}`, label: `${label} (${sha.slice(0, 7)} ${date})`, date, ...slim(graph) };
}

export function buildBaselines({ root, home, configDirs, config, current, refs = [], daysBack = [], snapshots = [] }) {
  const out = [];
  const env = { root, home, configDirs, config, snapshots };
  const head = git(root, ["rev-parse", "--verify", "--quiet", "HEAD"]);
  const seen = new Set([head]);
  const push = (b) => {
    if (b && !seen.has(b.sha)) {
      seen.add(b.sha);
      delete b.sha;
      out.push(b);
    }
  };
  for (const ref of refs) push(atRef(env, ref, ref));
  if (head && current.asOf) {
    for (const d of daysBack) {
      const before = new Date(Date.parse(current.asOf) - d * DAY).toISOString().slice(0, 10);
      const sha = git(root, ["rev-list", "-1", `--before=${before}T23:59:59Z`, "HEAD"]);
      if (sha) push(atRef(env, sha, `${d} days before HEAD`));
    }
  }
  const now = toJson(current);
  let previous = null;
  for (const s of snapshots) {
    if (s.json === now || s.json === previous) continue;
    previous = s.json;
    try {
      out.push({ kind: "snapshot", id: `snapshot:${s.date}`, label: `snapshot ${s.date}`, date: s.date, ...slim(JSON.parse(s.json)) });
    } catch {
      // A snapshot that no longer parses is not offered.
    }
  }
  return out;
}
