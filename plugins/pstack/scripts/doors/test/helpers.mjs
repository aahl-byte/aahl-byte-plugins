import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const DOORS_DIR = path.resolve(import.meta.dirname, "..");

/** A throwaway git repo holding a copy of test/<name>, so `git ls-files` sees only the fixture. */
export function fixtureRepo(name = "fixture", edit = () => {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pstack-doors-"));
  fs.cpSync(path.join(DOORS_DIR, "test", name), dir, { recursive: true });
  edit(dir);
  execFileSync("git", ["init", "-q"], { cwd: dir });
  return dir;
}
