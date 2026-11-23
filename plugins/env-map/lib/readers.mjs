// Read a project's files either from disk or as they stood at a git ref, through one interface.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
}

function tryGit(root, args) {
  try {
    return git(root, args);
  } catch {
    return null;
  }
}

function listDisk(abs) {
  try {
    return fs.readdirSync(abs).sort();
  } catch {
    return [];
  }
}

export function fsReader(root) {
  return {
    root,
    ref: null,
    read: (rel) => fs.readFileSync(path.join(root, rel), "utf8"),
    exists: (rel) => fs.existsSync(path.join(root, rel)),
    list: (rel) => listDisk(path.join(root, rel)),
    files() {
      const out = tryGit(root, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]);
      return out === null ? [] : out.split("\0").filter(Boolean).sort();
    },
    gitConfig: (key) => (tryGit(root, ["config", "--get", key]) ?? "").trim() || null,
  };
}

/** Files as they stood at `ref`; a file git never tracked at HEAD (local settings, say) is read from disk. */
export function gitReader(root, ref) {
  const disk = fsReader(root);
  const withDirs = (files) => {
    const set = new Set();
    for (const f of files) {
      const parts = f.split("/");
      for (let i = 1; i <= parts.length; i++) set.add(parts.slice(0, i).join("/"));
    }
    return set;
  };
  const atRef = new Set((tryGit(root, ["ls-tree", "-r", "-z", "--name-only", ref]) ?? "").split("\0").filter(Boolean));
  const atRefPaths = withDirs(atRef);
  const known = withDirs([...(tryGit(root, ["ls-files", "-z"]) ?? "").split("\0").filter(Boolean), ...atRef]);
  const untracked = (rel) => !known.has(rel);
  return {
    root,
    ref,
    read(rel) {
      if (atRef.has(rel)) return git(root, ["show", `${ref}:${rel}`]);
      if (untracked(rel)) return disk.read(rel);
      const e = new Error(`ENOENT: ${rel} not present at ${ref}`);
      e.code = "ENOENT";
      throw e;
    },
    exists: (rel) => atRefPaths.has(rel) || (untracked(rel) && disk.exists(rel)),
    list(rel) {
      const prefix = rel ? `${rel.replace(/\/$/, "")}/` : "";
      const names = new Set();
      for (const f of atRef) if (f.startsWith(prefix)) names.add(f.slice(prefix.length).split("/")[0]);
      for (const name of disk.list(rel)) if (untracked(prefix + name)) names.add(name);
      return [...names].sort();
    },
    files: () => [...atRef].sort(),
    gitConfig: disk.gitConfig,
  };
}
