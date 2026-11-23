// Runs every parser over one environment: the project repo, each global config dir, and each enabled plugin.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fsReader } from "../readers.mjs";
import { parseSettings } from "./settings.mjs";
import { parseGitHook } from "./githooks.mjs";
import { parseScript } from "./scripts.mjs";
import { parseClaudeMd } from "./claude-md.mjs";
import { parseMarkdownPart } from "./markdown.mjs";
import { parseInstalledPlugins } from "./plugins.mjs";

const real = (p) => {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
};

const isTestFile = (name) => /^test_|[._-](test|spec)\.|^__/.test(name);

/** Global config dirs: CLAUDE_CONFIG_DIR, ~/.claude, and any dir that installed plugin paths sit under. */
export function discoverConfigDirs(env = process.env, home = os.homedir()) {
  const found = [];
  const add = (dir, reason) => {
    if (!dir || !fs.existsSync(dir)) return;
    const r = real(dir);
    if (!found.some((f) => real(f.path) === r)) found.push({ path: path.resolve(dir), reason });
  };
  add(env.CLAUDE_CONFIG_DIR, "CLAUDE_CONFIG_DIR");
  add(path.join(home, ".claude"), "default ~/.claude");
  for (const { path: dir } of [...found]) {
    try {
      const json = JSON.parse(fs.readFileSync(path.join(dir, "plugins", "installed_plugins.json"), "utf8"));
      for (const entries of Object.values(json.plugins ?? {})) {
        for (const e of entries ?? []) {
          const m = /^(.*?)\/plugins\/cache\//.exec(e.installPath ?? "");
          if (m) add(m[1], "installed_plugins.json install paths");
        }
      }
    } catch {
      // A config dir without installed plugins adds no further dirs.
    }
  }
  return found;
}

export function collect({ root, home = os.homedir(), configDirs = [], config, reader = fsReader(root) }) {
  const tilde = (p) => (p === home ? "~" : p.startsWith(`${home}/`) ? `~${p.slice(home.length)}` : p);
  const repoReal = real(root);
  const roots = [{ label: "repo", path: repoReal, origin: "repo", owner: "ours", source: "project repo" }];
  for (const dir of configDirs) {
    const r = real(dir);
    if (!roots.some((x) => x.path === r)) roots.push({ label: `global:${tilde(dir)}`, path: r, origin: "global", owner: "external", source: tilde(dir) });
  }
  const sources = [];
  const boxes = [];
  const edges = [];
  const calls = [];
  const scriptFiles = new Map();
  const readOnce = new Set();
  const vars = { CLAUDE_PROJECT_DIR: root, HOME: home };

  const rootOf = (abs) => {
    const r = real(abs);
    let best = null;
    for (const x of roots) if ((r === x.path || r.startsWith(`${x.path}/`)) && (!best || x.path.length > best.path.length)) best = x;
    return best;
  };
  const sourceIdOf = (abs) => {
    const r = rootOf(abs);
    return r ? `${r.label}:${path.relative(r.path, real(abs))}` : `file:${tilde(abs)}`;
  };
  const inRepo = (abs) => abs === root || abs.startsWith(`${root}/`);

  /** Reads one file and parses it; a read or parse failure becomes an unreadable box carrying the error. */
  function readSource(abs, parse, { optional = true } = {}) {
    const id = inRepo(abs) ? `repo:${path.relative(root, abs)}` : sourceIdOf(abs);
    if (!inRepo(abs)) {
      const r = real(abs);
      if (readOnce.has(r)) return null;
      readOnce.add(r);
    }
    const rootLabel = id.startsWith("repo:") ? "repo" : rootOf(abs)?.label ?? "file";
    let text;
    try {
      text = inRepo(abs) ? reader.read(path.relative(root, abs)) : fs.readFileSync(abs, "utf8");
    } catch (e) {
      if (optional && e.code === "ENOENT") return null;
      return fail(id, abs, rootLabel, e.code === "ENOENT" ? `not found: ${tilde(abs)}` : e.message);
    }
    let result;
    try {
      result = parse(text, id);
    } catch (e) {
      return fail(id, abs, rootLabel, e.message);
    }
    if (result.error) return fail(id, abs, rootLabel, result.error);
    sources.push({ id, path: abs, status: "ok" });
    for (const b of result.boxes ?? []) {
      b.root ??= rootLabel;
      b.file ??= abs;
      boxes.push(b);
    }
    edges.push(...(result.edges ?? []));
    calls.push(...(result.calls ?? []));
    return result;
  }

  function fail(id, abs, rootLabel, error) {
    sources.push({ id, path: abs, status: "error", error });
    boxes.push({ id: `unreadable:${id}`, kind: "unreadable", label: path.basename(abs), error, source: id, root: rootLabel, file: abs });
    return null;
  }

  const list = (abs) => {
    if (inRepo(abs)) return reader.list(path.relative(root, abs));
    try {
      return fs.readdirSync(abs).sort();
    } catch {
      return [];
    }
  };
  const exists = (abs) => (inRepo(abs) ? reader.exists(path.relative(root, abs)) : fs.existsSync(abs));

  const settings = (abs) =>
    readSource(abs, (text, sourceId) => parseSettings({ text, sourceId, vars, baseDir: root }));
  const claudeMd = (abs) =>
    readSource(abs, (text, id) => parseClaudeMd({ text, id: `claude-md:${id}`, source: id, label: inRepo(abs) ? path.relative(root, abs) : tilde(abs) }));
  const markdownDir = (dir, kind, labelPrefix, { skillDirs }) => {
    for (const name of list(dir)) {
      const abs = skillDirs ? path.join(dir, name, "SKILL.md") : path.join(dir, name);
      if (!skillDirs && !name.endsWith(".md")) continue;
      if (skillDirs && !exists(abs)) continue;
      const short = skillDirs ? name : name.replace(/\.md$/, "");
      readSource(abs, (text, id) => ({
        boxes: [parseMarkdownPart({ text, id: `${kind}:${id.replace(/\/SKILL\.md$/, "").replace(/\.md$/, "")}`, kind, label: labelPrefix + short, source: id })],
      }));
    }
  };
  const hookDir = (dir) => {
    for (const name of list(dir)) {
      if (isTestFile(name) || !config.scriptExtensions.includes(path.extname(name))) continue;
      scriptFiles.set(path.join(dir, name), true);
    }
  };

  // Project repo.
  const enabled = {};
  const repoSettings = [];
  for (const rel of [".claude/settings.json", ".claude/settings.local.json"]) repoSettings.push(settings(path.join(root, rel)));
  const hooksDir = reader.gitConfig("core.hooksPath") ?? (exists(path.join(root, ".githooks")) ? ".githooks" : ".git/hooks");
  for (const name of list(path.join(root, hooksDir))) {
    if (name.endsWith(".sample")) continue;
    readSource(path.join(root, hooksDir, name), (text, sourceId) => parseGitHook({ text, sourceId, name, vars, baseDir: root }));
  }
  for (const rel of ["CLAUDE.md", ".claude/CLAUDE.md"]) claudeMd(path.join(root, rel));
  markdownDir(path.join(root, ".claude/skills"), "skill", "", { skillDirs: true });
  markdownDir(path.join(root, ".claude/agents"), "agent", "", { skillDirs: false });
  hookDir(path.join(root, ".claude/hooks"));

  // Global config dirs.
  const slug = root.replace(/[^A-Za-z0-9]/g, "-");
  const installed = [];
  const globalSettings = [];
  for (const dir of configDirs) {
    for (const name of ["settings.json", "settings.local.json"]) globalSettings.push(settings(path.join(dir, name)));
    claudeMd(path.join(dir, "CLAUDE.md"));
    markdownDir(path.join(dir, "skills"), "skill", "", { skillDirs: true });
    markdownDir(path.join(dir, "agents"), "agent", "", { skillDirs: false });
    markdownDir(path.join(dir, "projects", slug, "memory"), "memory", "", { skillDirs: false });
    hookDir(path.join(dir, "hooks"));
    readSource(path.join(dir, "plugins", "installed_plugins.json"), (text) => {
      installed.push(text);
      return {};
    });
  }
  for (const s of [...globalSettings, ...repoSettings]) Object.assign(enabled, s?.enabledPlugins ?? {});

  // Plugins that apply to this project.
  const seenPlugins = new Set();
  for (const text of installed) {
    for (const p of parseInstalledPlugins({ text, projectRoot: root, enabled, ourMarketplaces: config.ourMarketplaces })) {
      if (seenPlugins.has(p.key)) continue;
      seenPlugins.add(p.key);
      const id = `plugin:${p.key}`;
      if (!p.enabled) {
        sources.push({ id, path: p.installPath, status: "skipped", note: "disabled" });
        continue;
      }
      if (!fs.existsSync(p.installPath)) {
        fail(id, p.installPath, id, `plugin install path not found: ${tilde(p.installPath)}`);
        continue;
      }
      roots.push({ label: id, path: real(p.installPath), origin: "plugin", owner: p.owner, source: p.key, version: p.version });
      const pluginVars = { ...vars, CLAUDE_PLUGIN_ROOT: p.installPath };
      readSource(path.join(p.installPath, "hooks", "hooks.json"), (text, sourceId) => parseSettings({ text, sourceId, vars: pluginVars, baseDir: root }));
      markdownDir(path.join(p.installPath, "skills"), "skill", `${p.name}:`, { skillDirs: true });
      markdownDir(path.join(p.installPath, "agents"), "agent", `${p.name}:`, { skillDirs: false });
      hookDir(path.join(p.installPath, "hooks"));
    }
  }

  // Scripts: everything a hook calls, plus every script sitting in a hooks dir.
  for (const c of calls) scriptFiles.set(c.file, true);
  const scriptIds = new Map();
  for (const file of [...scriptFiles.keys()].sort()) {
    const sid = inRepo(file) ? `repo:${path.relative(root, file)}` : sourceIdOf(file);
    const id = `script:${sid}`;
    scriptIds.set(file, id);
    if (boxes.some((b) => b.id === id)) continue;
    const parsed = readSource(file, (text) => parseScript({ text, id, file, source: sid }), { optional: true });
    if (!parsed && !boxes.some((b) => b.id === id || b.id === `unreadable:${sid}`)) {
      boxes.push({ id, kind: "script", label: path.basename(file), file, source: sid, root: sid.startsWith("repo:") ? "repo" : rootOf(file)?.label ?? "file", error: `not found: ${tilde(file)}` });
      sources.push({ id: sid, path: file, status: "error", error: "not found" });
    }
  }
  for (const c of calls) edges.push({ from: c.from, to: scriptIds.get(c.file), kind: "calls" });

  return {
    roots: roots.map((r) => ({ ...r, path: r.label === "repo" ? root : r.path })),
    configDirs: configDirs.map((d) => tilde(d)),
    sources,
    boxes,
    edges,
    repoFiles: reader.files(),
  };
}
