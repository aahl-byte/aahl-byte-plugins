import { z } from "zod";
import { arg, defineTool } from "../../lib/tool.mjs";

export const meta = {
  why: "Moves a todo item to triage, in progress or review; the later lifecycle steps stay with people.",
  layer: "type",
  takes: ["write-todo"],
};

export default defineTool({
  name: "Todo_Status",
  description: "Move a todo item to in-triage (triage), in-progress (start) or review (review).",
  input: {
    query: arg("the item's id, or part of its title"),
    to: z.enum(["triage", "start", "review"]),
  },
  meta,
  command({ query, to }) {
    return { program: "todo", args: ["--agent", to, "--", query] };
  },
});
