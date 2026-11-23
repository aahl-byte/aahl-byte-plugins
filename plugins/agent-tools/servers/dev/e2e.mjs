import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { arg, defineTool, within } from "../../lib/tool.mjs";
import { fill, need } from "../../lib/config.mjs";
import { commandReport, lines, playwrightReport } from "../../lib/shape.mjs";

export const meta = {
  why: "Runs one Playwright spec on the worktree's own port, so parallel worktrees never share a server, and returns failures only.",
  layer: "test",
  takes: ["run-e2e"],
};

export default defineTool({
  name: "E2E",
  description:
    "Run one Playwright spec file on this worktree's port and return the failed and flaky tests, each with file:line, project and error. " +
    "spec: a spec file under the e2e directory, e.g. e2e/access.spec.ts. project: one Playwright project (all when omitted).",
  input: {
    spec: arg("a *.spec.ts file relative to the repo root"),
    project: arg("a Playwright project name").optional(),
  },
  meta,
  readOnly: true,
  async command({ spec, project }, ctx) {
    const e2e = need(ctx.config, "e2e");
    within(ctx.cwd, spec);
    const specDir = e2e.specDir ?? "e2e";
    if (!/\.spec\.[cm]?[jt]sx?$/.test(spec) || path.relative(specDir, spec).startsWith("..")) {
      throw new Error(`spec must be a *.spec.ts file under ${specDir}/`);
    }
    if (project && e2e.projects && !e2e.projects.includes(project)) throw new Error(`project must be one of ${e2e.projects.join(", ")}`);
    const [portProgram, ...portArgs] = fill(need(ctx.config, "e2e.port"), ctx.cwd);
    const found = await ctx.run({ program: portProgram, args: portArgs, timeoutMs: 30_000 });
    const port = found.stdout.trim();
    if (found.exit !== 0 || !/^\d+$/.test(port)) throw new Error(`the port command (${[portProgram, ...portArgs].join(" ")}) printed no port: ${found.stderr.trim()}`);
    const [program, ...args] = need(ctx.config, "e2e.run");
    return {
      program,
      args: [...args, "--reporter=json", ...(project ? [`--project=${project}`] : []), spec],
      env: { [e2e.portEnv ?? "E2E_PORT"]: port, PLAYWRIGHT_JSON_OUTPUT_NAME: ctx.tmp("playwright.json") },
      timeoutMs: 40 * 60 * 1000,
    };
  },
  shape(result, _input, ctx) {
    const file = ctx.tmp("playwright.json");
    if (!fs.existsSync(file)) return commandReport("E2E", result);
    const report = playwrightReport(JSON.parse(fs.readFileSync(file, "utf8")), ctx.cwd);
    if (report.failures.length === 0 && result.exit !== 0) report.lines = [...lines(result.stderr), ...lines(result.stdout)].slice(-30);
    return report;
  },
});
