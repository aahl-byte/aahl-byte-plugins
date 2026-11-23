// Finds a sibling plugin's directory, in this repo, a marketplace clone, or the versioned plugin cache.
import fs from "node:fs";
import path from "node:path";

export const PLUGIN_ROOT = path.resolve(import.meta.dirname, "..");

const isPlugin = (dir) => fs.existsSync(path.join(dir, ".claude-plugin", "plugin.json"));

export function pluginDir(name, root = PLUGIN_ROOT) {
  const sibling = path.resolve(root, "..", name);
  if (isPlugin(sibling)) return sibling;
  // The cache keeps <marketplace>/<plugin>/<version>/; take the newest version of the sibling.
  const cached = path.resolve(root, "..", "..", name);
  if (fs.existsSync(cached)) {
    const versions = fs
      .readdirSync(cached)
      .map((v) => path.join(cached, v))
      .filter(isPlugin)
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    if (versions.length) return versions[0];
  }
  throw new Error(`plugin ${name} is not installed next to agent-tools (looked in ${sibling} and ${cached})`);
}
