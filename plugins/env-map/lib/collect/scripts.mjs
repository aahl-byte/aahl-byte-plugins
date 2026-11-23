// Parses a script a hook calls: its own meta, and one contained box per entry in its RULES array.
import path from "node:path";
import { scriptMeta, scriptRules } from "../text.mjs";

export function parseScript({ text, id, file, source }) {
  const script = { id, kind: "script", label: path.basename(file), file, source, ...scriptMeta(text, path.extname(file)) };
  const boxes = [script];
  const edges = [];
  const body = id.slice("script:".length);
  for (const rule of scriptRules(text)) {
    const name = rule.id ?? `rule-${rule.index + 1}`;
    const ruleId = `rule:${body}#${name}`;
    const { index, id: _id, ...facts } = rule;
    boxes.push({ id: ruleId, kind: "rule", label: rule.id ?? rule.pattern?.sample ?? name, file, source, ...facts });
    edges.push({ from: id, to: ruleId, kind: "contains" });
  }
  return { boxes, edges };
}
