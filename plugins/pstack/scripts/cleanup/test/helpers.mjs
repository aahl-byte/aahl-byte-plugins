import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const CLEANUP_DIR = path.resolve(import.meta.dirname, "..");

/** A throwaway git repo holding a copy of test/fixture, with one commit so HEAD resolves. */
export function fixtureRepo(edit = () => {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pstack-cleanup-"));
  fs.cpSync(path.join(CLEANUP_DIR, "test", "fixture"), dir, { recursive: true });
  edit(dir);
  const git = (...args) => execFileSync("git", args, { cwd: dir, stdio: "ignore" });
  git("init", "-q");
  git("add", "-A");
  git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "fixture");
  return dir;
}

export function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "pstack-cleanup-out-"));
}
