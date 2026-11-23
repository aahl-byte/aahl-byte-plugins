import { z } from "zod";
import { arg, defineTool, flag } from "../../lib/tool.mjs";

export const meta = {
  why: "Shows the migration queue or one submission, read-only.",
  layer: "type",
  takes: ["queue-migration"],
};

export default defineTool({
  name: "DbRequest_Status",
  description: "Show the migration queue, or one submission in full with id. Filters: mine, open, branch, ticket.",
  input: {
    id: arg("a submission id or name").optional(),
    mine: z.boolean().optional(),
    open: z.boolean().optional().describe("leave out merged, archived and closed submissions"),
    branch: arg("only submissions from this branch").optional(),
    ticket: arg("only submissions for this ticket").optional(),
  },
  meta,
  readOnly: true,
  command({ id, mine, open, branch, ticket }) {
    return {
      program: "db-request",
      args: ["status", ...flag("id", id), ...flag("mine", mine), ...flag("open", open), ...flag("branch", branch), ...flag("ticket", ticket)],
    };
  },
});
