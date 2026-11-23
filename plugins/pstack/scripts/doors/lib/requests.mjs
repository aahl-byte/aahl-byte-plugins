// Reads the e2e request log the doorRequests fixture writes: one JSON file per Playwright worker, or a single file.
import fs from "node:fs";
import path from "node:path";

/** Every recorded request, merged by method, path, door, spec and test, with counts summed. */
export function readRequestLog(repo, logPath) {
  if (!logPath) return [];
  const abs = path.resolve(repo, logPath);
  if (!fs.existsSync(abs)) return [];
  const files = fs.statSync(abs).isDirectory()
    ? fs.readdirSync(abs).filter((f) => f.endsWith(".json")).sort().map((f) => path.join(abs, f))
    : [abs];
  const merged = new Map();
  for (const file of files) {
    let data;
    try {
      data = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      continue;
    }
    for (const r of data.requests ?? []) {
      const key = [r.method, r.path, r.door ?? "", r.spec ?? "", r.test ?? ""].join("\u0000");
      const prev = merged.get(key);
      if (prev) prev.count += r.count ?? 1;
      else merged.set(key, { method: r.method, path: r.path, door: r.door ?? null, spec: r.spec ?? null, test: r.test ?? null, count: r.count ?? 1 });
    }
  }
  return [...merged.values()];
}
