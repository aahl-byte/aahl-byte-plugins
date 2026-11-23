import { z } from "zod";
import { defineTool } from "../../lib/tool.mjs";

export const meta = {
  why: "Prints the specs/ parent-child tree that the manage-specs skill audits.",
  layer: "type",
  takes: ["run-plugin-script"],
};

export default defineTool({
  name: "Specs_Tree",
  description: "Print the spec tree from specs/ (parent and children from each file's frontmatter); json: the frontmatter as JSON.",
  input: { json: z.boolean().optional() },
  meta,
  readOnly: true,
  command({ json }, ctx) {
    return { program: "python3", args: [`${ctx.pluginDir("spec-management")}/scripts/spec-tree.py`, ...(json ? ["--json"] : [])] };
  },
});
