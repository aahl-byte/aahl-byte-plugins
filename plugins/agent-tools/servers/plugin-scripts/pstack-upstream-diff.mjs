import { z } from "zod";
import { arg, defineTool } from "../../lib/tool.mjs";

export const meta = {
  why: "Shows upstream pstack's changes since the forked commit, so an agent can port them without a shell.",
  layer: "type",
  takes: ["run-plugin-script"],
};

export default defineTool({
  name: "Pstack_UpstreamDiff",
  description:
    "Show upstream pstack's changes since the commit in plugins/pstack/UPSTREAM. log: the commit list instead of the diff. " +
    "stat: a diffstat. paths: limit to these paths inside upstream's pstack folder, e.g. skills/arena.",
  input: {
    log: z.boolean().optional(),
    stat: z.boolean().optional(),
    paths: z.array(arg("a path inside upstream pstack").refine((p) => !p.split("/").includes(".."), "must not contain ..")).optional(),
  },
  meta,
  readOnly: true,
  cap: { maxLines: 600, maxBytes: 60_000 },
  command({ log, stat, paths = [] }, ctx) {
    const script = `${ctx.pluginDir("pstack")}/scripts/upstream-diff.sh`;
    const tail = paths.length ? ["--", ...paths] : [];
    if (log) return { program: "bash", args: [script, "--log", ...tail] };
    return { program: "bash", args: [script, ...(stat ? ["--stat"] : []), ...tail] };
  },
});
