import { defineTool } from "../../lib/tool.mjs";
import { need } from "../../lib/config.mjs";
import { commandReport } from "../../lib/shape.mjs";

export const meta = {
  why: "Runs the project's own gate, so an agent checks its work the way the Stop hook will.",
  layer: "check",
  takes: ["run-gate"],
};

export default defineTool({
  name: "Check",
  description: "Run the project's gate (types, lint, repo rules, related tests). Returns ok, or each failure with the fix it names.",
  input: {},
  meta,
  readOnly: true,
  command(_input, ctx) {
    const [program, ...args] = need(ctx.config, "gate");
    return { program, args, timeoutMs: 15 * 60 * 1000 };
  },
  shape(result) {
    const report = commandReport("Check", result);
    return { ...report, lines: report.lines.filter((l) => l.trim() && !/^> /.test(l)) };
  },
});
