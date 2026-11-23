import { z } from "zod";
import { arg, defineTool, within } from "../../lib/tool.mjs";

export const meta = {
  why: "Runs pstack's door flag checker, so a cleaner sees the discovery message an agent gets for unsigned code using a flagged pattern.",
  layer: "check",
  takes: ["run-plugin-script", "check-door-flags"],
};

export default defineTool({
  name: "Pstack_DoorsCheck",
  description:
    "Check doors/flags.json against this worktree: each flag's authorities (the doors using its pattern, each with its why), " +
    "every unsigned use with the flag's probing questions, and forged signatures. files: report findings only in these files.",
  input: {
    files: z.array(arg("a source file relative to the repo root").refine((f) => !f.includes(","), "must not contain a comma")).optional(),
  },
  meta,
  readOnly: true,
  cap: { maxLines: 600, maxBytes: 60_000 },
  command({ files = [] }, ctx) {
    for (const f of files) within(ctx.cwd, f);
    return {
      program: "node",
      args: [`${ctx.pluginDir("pstack")}/scripts/doors/check.mjs`, "--repo", ctx.cwd, "--report-only", ...(files.length ? [`--files=${files.join(",")}`] : [])],
      timeoutMs: 5 * 60 * 1000,
    };
  },
});
