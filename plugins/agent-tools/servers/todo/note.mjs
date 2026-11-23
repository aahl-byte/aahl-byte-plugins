import { arg, defineTool, text } from "../../lib/tool.mjs";

export const meta = {
  why: "Appends a context note to a todo item; dev sessions record findings here instead of in chat.",
  layer: "type",
  takes: ["write-todo"],
};

export default defineTool({
  name: "Todo_Note",
  description: "Append a context note to a todo item.",
  input: {
    query: arg("the item's id, or part of its title"),
    text: text("the note"),
  },
  meta,
  command({ query, text }) {
    return { program: "todo", args: ["--agent", "note", "--", query, text] };
  },
});
