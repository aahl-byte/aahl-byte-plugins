import { defineTool, issueKey } from "../../lib/tool.mjs";

export const meta = {
  why: "Reads a Jira ticket's comments as JSON, read-only.",
  layer: "type",
  takes: ["read-jira"],
};

export default defineTool({
  name: "Jira_Comments",
  description: "Read a Jira ticket's comments as JSON.",
  input: { key: issueKey },
  meta,
  readOnly: true,
  command({ key }) {
    return { program: "jira", args: ["read:comments", "--", key] };
  },
});
