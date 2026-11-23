// The shape of one tool: typed input, env-map metadata, and either a fixed program to run or an in-process handler.
import path from "node:path";
import { z } from "zod";

const NAME = /^[A-Z][A-Za-z0-9]*(_[A-Z][A-Za-z0-9]*)*$/;

export function defineTool(def) {
  const { name, description, input, meta, command, handle } = def;
  if (!NAME.test(name ?? "")) throw new Error(`tool name "${name}" must be PascalCase words joined by _`);
  if (!description) throw new Error(`${name}: description is required`);
  if (!input || typeof input !== "object") throw new Error(`${name}: input must be a zod shape (use {} for none)`);
  if (!meta?.why || !meta?.layer || !Array.isArray(meta?.takes)) throw new Error(`${name}: meta needs why, layer and takes`);
  if (typeof command !== "function" && typeof handle !== "function") throw new Error(`${name}: give it a command or a handle`);
  return Object.freeze({ ...def });
}

export function inputSchema(tool) {
  return z.object(tool.input).strict();
}

/** A single argv-safe word: never empty, never starting with a dash, so it can't turn into a flag. */
export function arg(description) {
  return z
    .string()
    .min(1)
    .refine((s) => !s.startsWith("-"), "must not start with a dash")
    .refine((s) => !s.includes("\0"), "must not contain NUL")
    .describe(description);
}

/** Free text passed as one argv element or on stdin. */
export function text(description) {
  return z.string().min(1).refine((s) => !s.includes("\0"), "must not contain NUL").describe(description);
}

/** A Jira issue key such as SR-1234. */
export const issueKey = z.string().regex(/^[A-Z][A-Z0-9]+-\d+$/, "must be an issue key such as SR-1234").describe("an issue key such as SR-1234");

/** Throws unless p, taken from cwd, stays inside cwd. Returns p unchanged. */
export function within(cwd, p) {
  const abs = path.resolve(cwd, p);
  if (abs !== cwd && !abs.startsWith(cwd + path.sep)) throw new Error(`${p} is outside the working directory ${cwd}`);
  return p;
}

/** --name for true, --name=value for a value, nothing when unset or false. */
export function flag(name, value) {
  if (value === undefined || value === null || value === false) return [];
  if (value === true) return [`--${name}`];
  return [`--${name}=${value}`];
}
