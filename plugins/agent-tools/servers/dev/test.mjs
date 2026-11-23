import fs from "node:fs";
import { z } from "zod";
import { arg, defineTool, within } from "../../lib/tool.mjs";
import { need } from "../../lib/config.mjs";
import { commandReport, lines, vitestReport } from "../../lib/shape.mjs";

export const meta = {
  why: "Runs vitest and returns only the failures with file:line, so an agent reads what broke instead of pages of passing output.",
  layer: "test",
  takes: ["run-unit-tests"],
};

export default defineTool({
  name: "Test",
  description:
    "Run the project's vitest tests and return only the failures, each as file:line, test name and assertion message. " +
    "files: test files to run, relative to the repo root (all tests when empty). related: treat files as source files and run the tests that import them.",
  input: {
    files: z.array(arg("a path relative to the repo root")).optional(),
    related: z.boolean().optional().describe("run the tests related to these source files"),
  },
  meta,
  readOnly: true,
  async command({ files = [], related = false }, ctx) {
    for (const f of files) within(ctx.cwd, f);
    if (related && !files.length) throw new Error("related needs at least one file");
    const [program, ...args] = need(ctx.config, related ? "test.related" : "test.run");
    return {
      program,
      args: [...args, "--reporter=json", `--outputFile=${ctx.tmp("vitest.json")}`, ...files],
      timeoutMs: 15 * 60 * 1000,
    };
  },
  shape(result, _input, ctx) {
    const file = ctx.tmp("vitest.json");
    if (!fs.existsSync(file)) return commandReport("Test", result);
    const report = vitestReport(JSON.parse(fs.readFileSync(file, "utf8")), ctx.cwd);
    if (report.failures.length === 0 && result.exit !== 0) report.lines = [...lines(result.stderr), ...lines(result.stdout)].slice(-20);
    return report;
  },
});
