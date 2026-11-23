import { z } from "zod";
import { defineTool } from "../../lib/tool.mjs";
import { reviewName } from "./plan-clarity-init.mjs";

export const meta = {
  why: "Validates a plan-clarity review's config files, the check each review agent runs before building.",
  layer: "check",
  takes: ["run-plugin-script"],
};

export default defineTool({
  name: "PlanClarity_Validate",
  description: "Validate a review's *.config.yaml files (all of them when configs is empty) in docs/review/<name>/.",
  input: {
    name: reviewName,
    configs: z.array(z.string().regex(/^[a-z0-9-]+\.config\.yaml$/, "a file such as risk.config.yaml")).optional(),
  },
  meta,
  readOnly: true,
  command({ name, configs = [] }, ctx) {
    return { program: "node", args: ["scripts/validate.js", ...configs], cwd: `${ctx.cwd}/docs/review/${name}` };
  },
});
