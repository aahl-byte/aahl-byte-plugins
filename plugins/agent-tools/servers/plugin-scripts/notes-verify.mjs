import { arg, defineTool, within } from "../../lib/tool.mjs";

export const meta = {
  why: "Runs notes-architect's content checks (manifest, orphans, wikilinks) on a notes folder.",
  layer: "check",
  takes: ["run-plugin-script"],
};

export default defineTool({
  name: "Notes_Verify",
  description: "Check a notes folder against its structure.yaml: missing and orphan pages, duplicate slugs, broken wikilinks.",
  input: { root: arg("the notes folder (default notes)").optional() },
  meta,
  readOnly: true,
  command({ root = "notes" }, ctx) {
    within(ctx.cwd, root);
    return { program: "node", args: [`${ctx.pluginDir("notes-architect")}/scripts/verify-content.js`, root] };
  },
});
