// One tool call: check the input, run the fixed program, shape the output, redact it, and write the ledger line.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { inputSchema } from "./tool.mjs";
import { runSpec } from "./exec.mjs";
import { commandReport, redact, render } from "./shape.mjs";
import { appendLedger } from "./ledger.mjs";

function parseInput(tool, raw) {
  const result = inputSchema(tool).safeParse(raw ?? {});
  if (result.success) return result.data;
  throw new Error(result.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; "));
}

/** The spec a tool would run for this input, without running it. Throws when the input is refused. */
export async function buildSpec(tool, raw, ctx) {
  return tool.command(parseInput(tool, raw), ctx);
}

export async function callTool(tool, raw, ctx) {
  const start = Date.now();
  let tmpDir;
  const tmp = ctx.tmp ?? ((name) => path.join((tmpDir ??= fs.mkdtempSync(path.join(os.tmpdir(), "agent-tools-"))), name));
  const callCtx = { ...ctx, tmp };
  let exit = null;
  let error;
  let text;
  let isError = true;
  try {
    const input = parseInput(tool, raw);
    if (tool.handle) {
      const r = await tool.handle(input, callCtx);
      exit = r.exit ?? 0;
      text = r.text;
      isError = exit !== 0;
    } else {
      const spec = await tool.command(input, callCtx);
      const result = await runSpec({ cwd: ctx.cwd, ...spec });
      exit = result.exit;
      const shaped = tool.shape ? await tool.shape(result, input, callCtx) : commandReport(tool.name, result);
      text = render(shaped, tool.cap);
      isError = result.exit !== 0;
    }
  } catch (e) {
    error = e.message;
    text = `${tool.name}: refused: ${e.message}`;
  } finally {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  appendLedger(ctx.ledger, {
    ts: new Date().toISOString(),
    role: ctx.role,
    server: ctx.server,
    tool: tool.name,
    args: raw ?? {},
    exit,
    ms: Date.now() - start,
    cwd: ctx.cwd,
    ...(error ? { error } : {}),
  });
  return { text: redact(text), isError };
}
