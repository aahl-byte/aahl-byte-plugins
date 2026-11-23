// Change counts per file from git log, measured against the HEAD commit date so the result depends only on the repo.
import { execFileSync } from "node:child_process";

const DAY = 86400000;

function git(root, args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] });
}

export function gitHistory(root, files, windowDays) {
  let asOf;
  try {
    if (git(root, ["rev-parse", "--show-toplevel"]).trim() === "") throw new Error("not a repo");
    asOf = git(root, ["log", "-1", "--format=%cI"]).trim();
  } catch {
    return { asOf: null, files: {} };
  }
  if (!asOf) return { asOf: null, files: {} };
  const out = {};
  if (files.length) {
    const log = git(root, ["log", "--format=%x01%cI", "--name-only", "--no-renames", "--", ...files]);
    const since = Date.parse(asOf) - windowDays * DAY;
    let date = null;
    for (const line of log.split("\n")) {
      if (line.startsWith("\x01")) date = line.slice(1);
      else if (line && files.includes(line)) {
        const f = (out[line] ??= { changes: 0, last: date.slice(0, 10), inWindow: 0 });
        f.changes++;
        if (Date.parse(date) >= since) f.inWindow++;
      }
    }
  }
  return { asOf: asOf.slice(0, 10), files: out };
}
