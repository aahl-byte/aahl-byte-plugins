import { z } from "zod";
import { arg, defineTool, within } from "../../lib/tool.mjs";

export const meta = {
  why: "Read-only git diff with external diff and textconv drivers off, so reading a diff never runs configured programs.",
  layer: "type",
  takes: ["read-git-state"],
};

export default defineTool({
  name: "Git_Diff",
  description: "Show the unstaged diff, or the staged one with staged: true, optionally for one path. Read-only.",
  input: {
    path: arg("a file or directory relative to the repo root").optional(),
    staged: z.boolean().optional().describe("diff the index against HEAD instead of the working tree against the index"),
  },
  meta,
  readOnly: true,
  cap: { maxLines: 600, maxBytes: 60_000 },
  command({ path, staged }, ctx) {
    if (path) within(ctx.cwd, path);
    return {
      program: "git",
      args: ["--no-pager", "diff", "--no-color", "--no-ext-diff", "--no-textconv", ...(staged ? ["--staged"] : []), ...(path ? ["--", path] : [])],
    };
  },
});
