import { z } from "zod";
import { arg, defineTool } from "../../lib/tool.mjs";
import { dbEnv } from "./query.mjs";

export const meta = {
  why: "Browses a database schema by list, show and find, without the whole-schema dump that floods a context.",
  layer: "type",
  takes: ["query-db"],
};

export default defineTool({
  name: "Db_Schema",
  description:
    "Browse an environment's schema. list: schemas with counts, or one schema's tables (target: the schema). " +
    "show: one table, view, enum or function in full (target: schema.name). find: names matching target across the database.",
  input: {
    env: dbEnv,
    action: z.enum(["list", "show", "find"]),
    target: arg("a schema, schema.name, or search text").optional(),
  },
  meta,
  readOnly: true,
  command({ env, action, target }) {
    if (action !== "list" && !target) throw new Error(`${action} needs target`);
    return { program: "explore-db", args: ["schema", action, `--${env}`, ...(target ? ["--", target] : [])] };
  },
});
