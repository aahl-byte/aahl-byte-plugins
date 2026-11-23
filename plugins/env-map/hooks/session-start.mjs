#!/usr/bin/env node
// SessionStart hook: starts `env-map map` detached, so the session never waits for the page.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const meta = {
  why: "Keeps the environment map current without anyone remembering to run it: every session start redraws it in the background.",
  layer: "verify",
  takes: ["environment-map"],
};

const root = process.env.CLAUDE_PROJECT_DIR;
if (root && fs.existsSync(root)) {
  try {
    const out = path.join(root, ".claude", "env-map");
    fs.mkdirSync(out, { recursive: true });
    const log = fs.openSync(path.join(out, "last-run.log"), "w");
    const bin = new URL("../bin/env-map.mjs", import.meta.url).pathname;
    spawn(process.execPath, [bin, "map", "--root", root], { detached: true, stdio: ["ignore", log, log] }).unref();
  } catch {
    // The map is a convenience; a failure to start it must never block the session.
  }
}
process.exit(0);
