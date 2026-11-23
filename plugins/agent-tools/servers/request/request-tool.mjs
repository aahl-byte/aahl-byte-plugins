import { defineTool, text } from "../../lib/tool.mjs";

export const meta = {
  why: "A session with no shell says which tool it lacked, and the ledger line makes missing tools countable data.",
  layer: "type",
  takes: ["request-missing-tool"],
};

export default defineTool({
  name: "RequestTool",
  description:
    "Ask for a tool you need and don't have. It runs nothing: it records why you need it and what it would do, then returns 'recorded'. " +
    "Carry on with what you can do, and say in your report what you couldn't.",
  input: {
    why: text("what you were trying to do when you needed it"),
    what: text("the tool you wanted: its name, inputs and what it would return"),
  },
  meta,
  readOnly: true,
  handle() {
    return { text: "recorded", exit: 0 };
  },
});
