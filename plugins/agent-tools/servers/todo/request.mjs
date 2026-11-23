import { z } from "zod";
import { arg, defineTool, flag, text } from "../../lib/tool.mjs";

export const meta = {
  why: "Moves a todo item to requested, optionally posting a new version of its request text.",
  layer: "type",
  takes: ["write-todo"],
};

export default defineTool({
  name: "Todo_Request",
  description: "Move a todo item to requested. With text, post the full new version of the ticket request; url says where it happens.",
  input: {
    query: arg("the item's id, or part of its title"),
    text: text("the full new request text").optional(),
    url: z.url({ protocol: /^https?$/ }).optional(),
  },
  meta,
  command({ query, text, url }) {
    return { program: "todo", args: ["--agent", "request", ...flag("text", text), ...flag("url", url), "--", query] };
  },
});
