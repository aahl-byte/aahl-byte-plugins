import { z } from "zod";
import { arg, defineTool, flag } from "../../lib/tool.mjs";

export const meta = {
  why: "Lists todo items with typed filters for status, type, app and tag.",
  layer: "type",
  takes: ["read-todo"],
};

const TYPES = ["feature", "bug", "refactor", "question", "debt", "idea", "suggestion", "performance", "decoration", "spin-off"];

export default defineTool({
  name: "Todo_List",
  description: "List todo items (done and cancelled hidden unless all: true), optionally filtered by status, type, app or tag.",
  input: {
    status: arg("only items with this status, e.g. in-progress or review").optional(),
    type: z.enum(TYPES).optional(),
    app: arg("only items for this app").optional(),
    tag: arg("only items with this tag").optional(),
    mine: z.boolean().optional().describe("only items where I am the developer or QA assignee"),
    all: z.boolean().optional().describe("include done and cancelled items"),
  },
  meta,
  readOnly: true,
  command({ status, type, app, tag, mine, all }) {
    return {
      program: "todo",
      args: ["--agent", "list", ...flag("status", status), ...flag("type", type), ...flag("app", app), ...flag("tag", tag), ...flag("mine", mine), ...flag("all", all)],
    };
  },
});
