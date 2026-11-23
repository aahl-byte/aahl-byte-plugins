import { arg, defineTool, text } from "../../lib/tool.mjs";

export const meta = {
  why: "Appends a dated dev-log entry to a todo item, the record of what a session did.",
  layer: "type",
  takes: ["write-todo"],
};

export default defineTool({
  name: "Todo_Log",
  description: "Append a dated dev-log entry to a todo item: what you did, what passed, what's left.",
  input: {
    query: arg("the item's id, or part of its title"),
    text: text("the log entry"),
  },
  meta,
  command({ query, text }) {
    return { program: "todo", args: ["--agent", "log", "--", query, text] };
  },
});
