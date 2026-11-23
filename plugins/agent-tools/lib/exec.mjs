// Runs one fixed program with an argv array. No shell is ever involved.
import { spawn } from "node:child_process";

const MAX_CAPTURE = 20 * 1024 * 1024;

export function runSpec({ program, args = [], cwd, env, stdin, timeoutMs = 10 * 60 * 1000 }) {
  return new Promise((resolve) => {
    const start = Date.now();
    const out = { stdout: [], stderr: [], bytes: 0 };
    let timedOut = false;
    let child;
    try {
      child = spawn(program, args, {
        cwd,
        env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1", ...env },
        stdio: ["pipe", "pipe", "pipe"],
        detached: true,
      });
    } catch (e) {
      resolve({ exit: null, error: e.message, stdout: "", stderr: "", ms: 0 });
      return;
    }
    const collect = (key) => (chunk) => {
      if (out.bytes >= MAX_CAPTURE) return;
      out.bytes += chunk.length;
      out[key].push(chunk);
    };
    child.stdout.on("data", collect("stdout"));
    child.stderr.on("data", collect("stderr"));
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    }, timeoutMs);
    let spawnError;
    child.on("error", (e) => (spawnError = e.message));
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({
        exit: code,
        signal,
        timedOut,
        ...(spawnError ? { error: spawnError } : {}),
        stdout: Buffer.concat(out.stdout).toString("utf8"),
        stderr: Buffer.concat(out.stderr).toString("utf8"),
        ms: Date.now() - start,
      });
    });
    child.stdin.on("error", () => {});
    child.stdin.end(stdin ?? "");
  });
}
