import { z } from "zod";
import { arg, defineTool, flag, text } from "../../lib/tool.mjs";

export const meta = {
  why: "Raises a clarification question on a todo item, so questions are tracked where the user answers them.",
  layer: "type",
  takes: ["write-todo"],
};

export default defineTool({
  name: "Todo_Ask",
  description: "Raise a clarification question on a todo item; re continues the thread of an earlier question.",
  input: {
    query: arg("the item's id, or part of its title"),
    text: text("the question"),
    re: z.number().int().positive().optional().describe("the id of the question this follows up"),
  },
  meta,
  outward: true,
  command({ query, text, re }) {
    return { program: "todo", args: ["--agent", "ask", ...flag("re", re), "--", query, text] };
  },
});
