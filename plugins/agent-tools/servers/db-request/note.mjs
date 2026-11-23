import { arg, defineTool, flag, text } from "../../lib/tool.mjs";

export const meta = {
  why: "Attaches a note to a submission's latest revision, the channel to the DBA.",
  layer: "type",
  takes: ["queue-migration"],
};

export default defineTool({
  name: "DbRequest_Note",
  description: "Attach a note to a migration submission's latest revision.",
  input: {
    id: arg("a submission id or name"),
    body: text("the note"),
  },
  meta,
  outward: true,
  command({ id, body }) {
    return { program: "db-request", args: ["note", ...flag("id", id), "--", body] };
  },
});
