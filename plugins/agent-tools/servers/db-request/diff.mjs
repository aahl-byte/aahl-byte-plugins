import { arg, defineTool, flag } from "../../lib/tool.mjs";

export const meta = {
  why: "Diffs a submission's latest requested script against its latest released one, read-only.",
  layer: "type",
  takes: ["queue-migration"],
};

export default defineTool({
  name: "DbRequest_Diff",
  description: "Diff a submission's latest requested script against its latest released one.",
  input: { id: arg("a submission id or name") },
  meta,
  readOnly: true,
  command({ id }) {
    return { program: "db-request", args: ["diff", ...flag("id", id)] };
  },
});
