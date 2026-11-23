import { z } from "zod";
import { arg, defineTool, flag, within } from "../../lib/tool.mjs";

export const meta = {
  why: "Extracts a PDF's text for the literature scout; downloads land in a fresh folder and nothing from it runs.",
  layer: "type",
  takes: ["run-plugin-script"],
};

export default defineTool({
  name: "Research_PdfToText",
  description: "Print a PDF's text page by page, from an https URL or a local path. pages: a 1-based range such as 1-8. out: write the text to this file instead.",
  input: {
    source: z.union([z.url({ protocol: /^https?$/ }), arg("a local PDF path")]),
    pages: z.string().regex(/^\d+(-\d+)?$/).optional(),
    downloadDir: arg("parent folder for the download (default pdfs)").optional(),
    out: arg("write the text here, relative to the working directory").optional(),
  },
  meta,
  readOnly: true,
  command({ source, pages, downloadDir, out }, ctx) {
    if (downloadDir) within(ctx.cwd, downloadDir);
    if (out) within(ctx.cwd, out);
    return {
      program: "uv",
      args: [
        "run",
        "--script",
        `${ctx.pluginDir("research")}/scripts/pdf_to_text.py`,
        ...flag("download-dir", downloadDir),
        ...flag("pages", pages),
        ...flag("out", out),
        "--",
        source,
      ],
      timeoutMs: 5 * 60 * 1000,
    };
  },
});
