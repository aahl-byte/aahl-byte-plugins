// Parses a skill, agent or memory file: its meta, whether the model can trigger it, and the plugin:name ids it mentions.
import { parseFrontmatter } from "../text.mjs";

export function parseMarkdownPart({ text, id, kind, label, source }) {
  const { data } = parseFrontmatter(text);
  const box = { id, kind, label, source };
  for (const key of ["why", "layer", "takes"]) if (data[key] !== undefined) box[key] = data[key];
  const hasDescription = typeof data.description === "string" && data.description.trim() !== "";
  const modelOff = data["disable-model-invocation"] === true;
  const userOff = data["user-invocable"] === false;
  box.triggerable = hasDescription && !(modelOff && userOff);
  box.mentions = [...new Set([...text.matchAll(/(?<![\w./-])([a-z0-9][a-z0-9-]*:[a-z0-9][a-z0-9-]*)(?![\w/-])/g)].map((m) => m[1]))].sort();
  return box;
}
