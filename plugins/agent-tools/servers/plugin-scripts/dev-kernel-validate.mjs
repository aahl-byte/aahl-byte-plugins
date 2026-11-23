import { arg, defineTool, within } from "../../lib/tool.mjs";

export const meta = {
  why: "Validates a dev-kernel status.yaml, the check the dk-plan skill and plan-assemble agent run after writing one.",
  layer: "check",
  takes: ["run-plugin-script"],
};

export default defineTool({
  name: "DevKernel_Validate",
  description: "Validate a dev-kernel initiative's status.yaml against the DK template schema (verbose: warnings too).",
  input: { file: arg("the status.yaml, e.g. tmp/initiatives/<name>/status.yaml") },
  meta,
  readOnly: true,
  command({ file }, ctx) {
    within(ctx.cwd, file);
    return { program: "python3", args: [`${ctx.pluginDir("dev-kernel")}/scripts/dk/validate.py`, file, "--verbose"] };
  },
});
