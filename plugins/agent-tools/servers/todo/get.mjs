import { z } from "zod";
import { arg, defineTool } from "../../lib/tool.mjs";

export const meta = {
  why: "Reads one todo item in full: its request, tasks, notes and recent log.",
  layer: "type",
  takes: ["read-todo"],
};

export default defineTool({
  name: "Todo_Get",
  description: "Show one todo item in full: request, status, tasks, notes, links and the last dev-log entries.",
  input: {
    query: arg("the item's id, or part of its title"),
    log: z.boolean().optional().describe("show the whole dev log, not just the last 3 entries"),
  },
  meta,
  readOnly: true,
  command({ query, log }) {
    return { program: "todo", args: ["--agent", "get", ...(log ? ["--log"] : []), "--", query] };
  },
});
