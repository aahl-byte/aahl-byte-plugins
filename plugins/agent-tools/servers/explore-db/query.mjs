import { z } from "zod";
import { defineTool, text } from "../../lib/tool.mjs";

export const meta = {
  why: "Read-only SQL against a configured environment; the SQL goes on stdin, so no query text can reach the launcher's flag parsing.",
  layer: "type",
  takes: ["query-db"],
};

export const dbEnv = z
  .string()
  .regex(/^[a-z][a-z0-9_]*$/, "an environment name such as dev or staging")
  .describe("a configured environment, e.g. dev or staging");

export default defineTool({
  name: "Db_Query",
  description:
    "Run SQL in one read-only transaction against a configured environment (the server rejects writes). " +
    "Returns the last statement's rows, cut at 200 lines; add a LIMIT for big tables.",
  input: {
    env: dbEnv,
    sql: text("the SQL to run"),
    format: z.enum(["table", "vertical", "json", "csv"]).optional().describe("output format (default table; vertical suits wide rows)"),
  },
  meta,
  readOnly: true,
  command({ env, sql, format = "table" }) {
    return { program: "explore-db", args: [`--${env}`, `--format=${format}`, "--no-pager"], stdin: sql, timeoutMs: 5 * 60 * 1000 };
  },
});
