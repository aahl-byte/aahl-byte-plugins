import { z } from "zod";
import { defineTool } from "../../lib/tool.mjs";

export const meta = {
  why: "Scaffolds a plan-clarity review site, the first step of the pc-review skill.",
  layer: "type",
  takes: ["run-plugin-script"],
};

export const reviewName = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "a slug such as auth-redesign").describe("the review's slug");

export default defineTool({
  name: "PlanClarity_Init",
  description: "Scaffold docs/review/<name>/ from the plan-clarity template and install its packages.",
  input: { name: reviewName },
  meta,
  command({ name }, ctx) {
    const root = ctx.pluginDir("plan-clarity");
    return { program: "bash", args: [`${root}/scripts/review/init.sh`, name], env: { CLAUDE_PLUGIN_ROOT: root }, timeoutMs: 10 * 60 * 1000 };
  },
});
