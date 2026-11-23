// Parses one git hook file: fired by its git event, calling the scripts it runs.
import { scriptMeta } from "../text.mjs";
import { calledFiles } from "./settings.mjs";

export function parseGitHook({ text, sourceId, name, vars, baseDir }) {
  const id = `githook:${sourceId}`;
  const box = { id, kind: "githook", label: name, event: `git:${name}`, source: sourceId, ...scriptMeta(text, "") };
  const body = text
    .split(/\r?\n/)
    .filter((l) => !/^\s*#/.test(l))
    .join("\n");
  return {
    boxes: [box],
    edges: [{ from: `event:git:${name}`, to: id, kind: "fires" }],
    calls: calledFiles(body, vars, baseDir).map((file) => ({ from: id, file })),
  };
}
