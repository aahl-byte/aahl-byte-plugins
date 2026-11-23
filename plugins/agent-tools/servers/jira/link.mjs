import { z } from "zod";
import { defineTool, issueKey } from "../../lib/tool.mjs";

export const meta = {
  why: "Links two Jira tickets with a fixed set of link types.",
  layer: "type",
  takes: ["write-jira"],
};

export default defineTool({
  name: "Jira_Link",
  description:
    'Link two Jira tickets. "from relates to to" with type Relates; "to is an action item from from" with type "Action item" and from as the source ticket.',
  input: {
    from: issueKey,
    to: issueKey,
    type: z.enum(["Relates", "Blocks", "Duplicates", "Clones", "Action item"]),
  },
  meta,
  outward: true,
  command({ from, to, type }) {
    return { program: "jira", args: ["add:link", `--type=${type}`, "--", from, to] };
  },
});
