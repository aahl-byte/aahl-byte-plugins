import { defineTool, issueKey } from "../../lib/tool.mjs";

export const meta = {
  why: "Reads one Jira ticket as JSON; separate from the writes so a role can read Jira without commenting.",
  layer: "type",
  takes: ["read-jira"],
};

export default defineTool({
  name: "Jira_Read",
  description: "Read one Jira ticket as JSON: summary, status, description, assignee, links.",
  input: { key: issueKey },
  meta,
  readOnly: true,
  command({ key }) {
    return { program: "jira", args: ["read:ticket", "--", key] };
  },
});
