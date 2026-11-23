import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { arg, defineTool } from "../../lib/tool.mjs";
import { commandReport, lines } from "../../lib/shape.mjs";

export const meta = {
  why: "Runs pstack's cleanup report on the worktree, so a cleaner can see duplicates, flag findings, raw elements and seeds without a shell.",
  layer: "check",
  takes: ["run-plugin-script", "report-cleanup"],
};

const SECTIONS = {
  duplicates: "Duplicates",
  flags: "Flag findings",
  "raw-elements": "Raw interactive elements",
  "unsigned-requests": "Unsigned requests",
  seeds: "Seeds",
};

/** The markdown from `start` up to the next heading at the same level or above. */
function block(md, start, level) {
  const rest = md.slice(start);
  const stop = new RegExp(`\\n#{2,${level}} `);
  const m = stop.exec(rest.slice(1));
  return m ? rest.slice(0, m.index + 1) : rest;
}

export default defineTool({
  name: "Pstack_CleanupReport",
  description:
    "Run the cleanup report on this worktree. With no input: the counts and every item's id and title. " +
    "section: one section in full (duplicates, flags, raw-elements, unsigned-requests, seeds). id: one item in full.",
  input: {
    section: z.enum(Object.keys(SECTIONS)).optional(),
    id: arg("a report item id, e.g. dup-1a2b3c4d").optional(),
  },
  meta,
  readOnly: true,
  cap: { maxLines: 600, maxBytes: 60_000 },
  command(_input, ctx) {
    return { program: "node", args: [`${ctx.pluginDir("pstack")}/scripts/cleanup/report.mjs`, "--repo", ctx.cwd, "--out", ctx.tmp("report")], timeoutMs: 10 * 60 * 1000 };
  },
  shape(result, { section, id }, ctx) {
    const file = path.join(ctx.tmp("report"), "report.md");
    if (result.exit !== 0 || !fs.existsSync(file)) return commandReport("Pstack_CleanupReport", result);
    const md = fs.readFileSync(file, "utf8");
    const status = lines(result.stdout)[0] ?? "report: done";
    if (id) {
      const at = md.indexOf(`\n### ${id}\n`);
      return at < 0 ? { status: `no item ${id} in the report`, lines: [] } : { status, lines: lines(block(md, at + 1, 3)) };
    }
    if (section) {
      const at = md.indexOf(`\n## ${SECTIONS[section]} (`);
      return at < 0 ? { status: `no ${section} section`, lines: [] } : { status, lines: lines(block(md, at + 1, 2)) };
    }
    const index = [];
    const re = /^### (\S+)\n\n(.+)$/gm;
    for (let m = re.exec(md); m; m = re.exec(md)) index.push(`${m[1]}  ${m[2]}`);
    return { status, lines: [...lines(md.slice(0, md.indexOf("\n## "))), "", ...index] };
  },
});
