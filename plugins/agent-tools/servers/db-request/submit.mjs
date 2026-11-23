import { z } from "zod";
import { arg, defineTool, flag, text, within } from "../../lib/tool.mjs";

export const meta = {
  why: "Queues a migration from the current branch; high-stakes, so it lives on its own server that no preset role includes.",
  layer: "type",
  takes: ["queue-migration"],
};

export default defineTool({
  name: "DbRequest_Submit",
  description:
    "Queue a migration script from the current git branch (the feature branch that needs it). Commit the script first, e.g. docs/db/<name>.sql. " +
    "Lint it with DbRequest_Lint before submitting.",
  input: {
    name: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "a short slug such as finance-tracker-stips").describe("a short slug"),
    description: text("what the migration does"),
    script: arg("the .sql file, relative to the repo root"),
    ticket: z.string().regex(/^[A-Z][A-Z0-9]+-\d+$/).optional().describe("the Jira ticket (default: the one in the branch name)"),
    dependsOn: z.number().int().positive().optional().describe("a submission this one depends on"),
  },
  meta,
  outward: true,
  command({ name, description, script, ticket, dependsOn }, ctx) {
    within(ctx.cwd, script);
    return {
      program: "db-request",
      args: ["submit", ...flag("name", name), ...flag("description", description), ...flag("script", script), ...flag("ticket", ticket), ...flag("depends-on", dependsOn)],
    };
  },
});
