import { defineTool } from "../../lib/tool.mjs";

export const meta = {
  why: "Runs env-map's gate on the working directory, so a session can see which parts it owns still lack why, layer or takes.",
  layer: "check",
  takes: ["run-plugin-script"],
};

export default defineTool({
  name: "EnvMap_Check",
  description: "Run env-map check on this project: every hook, script, skill and CLAUDE.md we own must state why, layer and takes.",
  input: {},
  meta,
  readOnly: true,
  command(_input, ctx) {
    return { program: "node", args: [`${ctx.pluginDir("env-map")}/bin/env-map.mjs`, "check", "--root", ctx.cwd] };
  },
});
