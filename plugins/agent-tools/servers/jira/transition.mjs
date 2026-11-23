import { z } from "zod";
import { defineTool, issueKey } from "../../lib/tool.mjs";

export const meta = {
  why: "Moves a Jira ticket to a named status, separate from reads and comments so a role can be granted it alone.",
  layer: "type",
  takes: ["write-jira"],
};

export default defineTool({
  name: "Jira_Transition",
  description: "Move a Jira ticket to a status by name, e.g. In Progress. The ticket must allow that transition from where it is.",
  input: {
    key: issueKey,
    status: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9 ._/-]*$/, "a status name such as In Progress").describe("the target status name"),
  },
  meta,
  outward: true,
  command({ key, status }) {
    return { program: "jira", args: ["set:status", "--", key, status] };
  },
});
