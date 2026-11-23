import { z } from "zod";
import { defineTool, issueKey } from "../../lib/tool.mjs";

export const meta = {
  why: "Posts a Jira comment, outward-facing and impossible to edit later, so it refuses the non-ASCII text the Jira stack garbles.",
  layer: "type",
  takes: ["write-jira"],
};

export default defineTool({
  name: "Jira_Comment",
  description:
    "Post a comment on a Jira ticket. It can't be edited or deleted afterwards. Use Jira wiki syntax (h3., *bold*, {code}), not Markdown, " +
    "and ASCII only: em-dashes, curly quotes and arrows are refused. Mention someone with [~accountid:<id>].",
  input: {
    key: issueKey,
    body: z.string().min(1).describe("the comment, in Jira wiki syntax, ASCII only"),
  },
  meta,
  outward: true,
  command({ key, body }) {
    const bad = [...body].find((c) => c.charCodeAt(0) > 0x7e || (c.charCodeAt(0) < 0x20 && c !== "\n" && c !== "\t"));
    if (bad) throw new Error(`body must be ASCII; replace ${JSON.stringify(bad)} (U+${bad.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")})`);
    return { program: "jira", args: ["add:comment", "--", key, "-"], stdin: body };
  },
});
