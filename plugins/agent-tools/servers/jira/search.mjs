import { z } from "zod";
import { arg, defineTool, flag, text } from "../../lib/tool.mjs";

export const meta = {
  why: "Searches Jira by JQL or by project and title, listing key, status and summary only.",
  layer: "type",
  takes: ["read-jira"],
};

export default defineTool({
  name: "Jira_Search",
  description:
    "Search Jira and list key, status and summary. Give jql, or a project key with optional title and status filters. " +
    "Results default to your own tickets; allUsers: true searches everyone's.",
  input: {
    jql: text("a JQL query").optional(),
    project: z.string().regex(/^[A-Z][A-Z0-9]+$/).optional().describe("a project key such as SR"),
    title: arg("text the summary contains").optional(),
    status: arg("only this status").optional(),
    allUsers: z.boolean().optional(),
    limit: z.number().int().min(1).max(100).optional().describe("max results (default 20)"),
  },
  meta,
  readOnly: true,
  command({ jql, project, title, status, allUsers, limit = 20 }) {
    const common = ["--list", `--limit=${limit}`];
    if (jql) return { program: "jira", args: ["read:jql", ...common, ...flag("all-users", allUsers), "--", jql] };
    if (!project) throw new Error("give jql or project");
    return {
      program: "jira",
      args: ["read:project", ...common, ...flag("title", title), ...flag("status", status), ...flag("all-users", allUsers), "--", project],
    };
  },
});
