import { arg, defineTool, flag, within } from "../../lib/tool.mjs";

export const meta = {
  why: "Copies a file from the working directory into a todo item's docs; files elsewhere are refused.",
  layer: "type",
  takes: ["write-todo"],
};

export default defineTool({
  name: "Todo_Doc",
  description: "Copy a file in the working directory into a todo item's docs (replacing a doc of the same name). Write the file first.",
  input: {
    query: arg("the item's id, or part of its title"),
    file: arg("a file relative to the working directory"),
    name: arg("the doc's name (default: the file's name)").optional(),
  },
  meta,
  command({ query, file, name }, ctx) {
    within(ctx.cwd, file);
    return { program: "todo", args: ["--agent", "doc", "add", ...flag("name", name), "--", query, file] };
  },
});
