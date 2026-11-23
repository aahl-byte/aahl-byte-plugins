import { defineTool } from "../../lib/tool.mjs";

export const meta = {
  why: "Read-only git status, so a session can see its changes without a shell that can also commit or reset.",
  layer: "type",
  takes: ["read-git-state"],
};

export default defineTool({
  name: "Git_Status",
  description: "Show the branch and every changed, staged and untracked file (git status --porcelain). Read-only.",
  input: {},
  meta,
  readOnly: true,
  command() {
    return { program: "git", args: ["--no-pager", "status", "--porcelain=v1", "--branch", "--untracked-files=all"] };
  },
});
