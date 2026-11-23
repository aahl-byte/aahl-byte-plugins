import { z } from "zod";
import { arg, defineTool, flag, text } from "../../lib/tool.mjs";

export const meta = {
  why: "Adds a child task to a todo item or moves one through start, review and done.",
  layer: "type",
  takes: ["write-todo"],
};

export default defineTool({
  name: "Todo_Task",
  description:
    "Manage a todo item's child tasks. action add needs title (and takes an optional phase); start, review and done need the task id from Todo_Get.",
  input: {
    query: arg("the item's id, or part of its title"),
    action: z.enum(["add", "start", "review", "done"]),
    title: text("the new task's title (add)").optional(),
    phase: z.number().int().positive().optional().describe("phase number for a new task (add)"),
    id: z.number().int().positive().optional().describe("the task id (start, review, done)"),
  },
  meta,
  command({ query, action, title, phase, id }) {
    if (action === "add") {
      if (!title) throw new Error("add needs title");
      return { program: "todo", args: ["--agent", "task", "add", ...flag("phase", phase), "--", query, title] };
    }
    if (id === undefined) throw new Error(`${action} needs id`);
    return { program: "todo", args: ["--agent", "task", action, "--", query, String(id)] };
  },
});
