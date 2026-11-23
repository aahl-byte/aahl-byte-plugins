import { z } from "zod";
import { arg, defineTool, flag, text } from "../../lib/tool.mjs";

export const meta = {
  why: "Attaches a typed link (PR, preview, QA handoff) to a todo item.",
  layer: "type",
  takes: ["write-todo"],
};

const TYPES = ["pr", "preview", "qa-handoff", "external-ticket", "bug-ticket", "documentation", "design", "wt-file", "other"];

export default defineTool({
  name: "Todo_Url",
  description: "Attach a link to a todo item: a PR, preview, QA handoff, ticket, doc or design.",
  input: {
    query: arg("the item's id, or part of its title"),
    url: z.url({ protocol: /^https?$/ }).describe("an http(s) URL"),
    type: z.enum(TYPES).optional(),
    label: text("display text (default: the URL)").optional(),
  },
  meta,
  outward: true,
  command({ query, url, type, label }) {
    return { program: "todo", args: ["--agent", "url", ...flag("type", type), ...flag("label", label), "--", query, url] };
  },
});
