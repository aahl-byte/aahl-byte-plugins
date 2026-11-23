import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mapEnvironment } from "../../lib/map.mjs";
import { loadConfig } from "../../lib/config.mjs";

const FIXTURES = new URL("../fixtures/", import.meta.url).pathname;

export const slug = (p) => p.replace(/[^A-Za-z0-9]/g, "-");

export function tempDir(prefix = "env-map-") {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

export function writeFiles(dir, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, typeof content === "string" ? content : JSON.stringify(content, null, 2));
  }
}

/** The golden fixture copied to a temp dir, with the files whose content depends on that dir's path. */
export function goldenEnv() {
  const T = tempDir("env-map-golden-");
  fs.cpSync(path.join(FIXTURES, "golden"), T, { recursive: true });
  const root = path.join(T, "repo");
  writeFiles(T, {
    "home/.claude/plugins/installed_plugins.json": {
      version: 2,
      plugins: {
        "tools@aahl-byte": [{ scope: "user", installPath: path.join(T, "plugin-cache/tools/1.0.0"), version: "1.0.0" }],
        "other@elsewhere": [{ scope: "user", installPath: path.join(T, "plugin-cache/other/2.0.0"), version: "2.0.0" }],
      },
    },
    [`home/.claude/projects/${slug(root)}/memory/note.md`]: "---\nname: note\ndescription: A note.\n---\nRemember.\n",
  });
  return { T, root, home: path.join(T, "home"), configDirs: [path.join(T, "home/.claude")] };
}

/**
 * A temp environment from a spec: `repo`, `home` and `plugins` file maps, optional git commits for the repo
 * ({ date, files }), and plugins listed as { key: { files } } installed at user scope and enabled.
 */
export function makeEnv({ repo = {}, home = {}, plugins = {}, commits = [] } = {}) {
  const T = tempDir();
  const root = path.join(T, "repo");
  fs.mkdirSync(root, { recursive: true });
  writeFiles(root, repo);
  const installed = { version: 2, plugins: {} };
  const enabled = {};
  for (const [key, spec] of Object.entries(plugins)) {
    const dir = path.join(T, "plugin-cache", key.replace("@", "-"));
    writeFiles(dir, spec.files ?? {});
    installed.plugins[key] = [{ scope: "user", installPath: dir, version: spec.version ?? "1.0.0" }];
    enabled[key] = true;
  }
  const globalSettings = home[".claude/settings.json"] ?? {};
  writeFiles(path.join(T, "home"), {
    ...home,
    ".claude/settings.json": { ...globalSettings, enabledPlugins: { ...(globalSettings.enabledPlugins ?? {}), ...enabled } },
    ".claude/plugins/installed_plugins.json": installed,
  });
  if (commits.length) {
    const git = (args, date) =>
      execFileSync("git", args, { cwd: root, stdio: "ignore", env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } });
    git(["init", "-q"]);
    git(["config", "user.email", "t@t"]);
    git(["config", "user.name", "t"]);
    for (const c of commits) {
      writeFiles(root, c.files);
      git(["add", "-A"], c.date);
      git(["commit", "-qm", c.date], c.date);
    }
  }
  return { T, root, home: path.join(T, "home"), configDirs: [path.join(T, "home/.claude")] };
}

export function mapEnv(env, config = loadConfig()) {
  return mapEnvironment({ ...env, config });
}
