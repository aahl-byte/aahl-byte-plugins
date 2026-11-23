import { arg, defineTool, within } from "../../lib/tool.mjs";

export const meta = {
  why: "Checks a migration script against the drain's rules before it is submitted, read-only.",
  layer: "check",
  takes: ["queue-migration"],
};

export default defineTool({
  name: "DbRequest_Lint",
  description: "Check a migration script against the rules the drain applies, before submitting it.",
  input: { script: arg("the .sql file, relative to the repo root") },
  meta,
  readOnly: true,
  command({ script }, ctx) {
    within(ctx.cwd, script);
    return { program: "db-request", args: ["lint", "--", script] };
  },
});
