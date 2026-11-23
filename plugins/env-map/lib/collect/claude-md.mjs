// Parses a CLAUDE.md: one box loaded at session start, and one row box per line of a "Rule | Enforced by" table.
import { parseFrontmatter } from "../text.mjs";

const GIT_HOOK_MENTION = /\b(pre-commit|prepare-commit-msg|commit-msg|post-commit|pre-push|post-merge|post-checkout)\b\s+hooks?\b/g;

const cells = (line) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim());

const plain = (md) => md.replace(/`([^`]*)`/g, "$1").replace(/\*\*?([^*]+)\*\*?/g, "$1").trim();

export function parseClaudeMd({ text, id, source, label }) {
  const { data, body } = parseFrontmatter(text);
  const box = { id, kind: "claude-md", label, source };
  for (const key of ["why", "layer", "takes"]) if (data[key] !== undefined) box[key] = data[key];
  const boxes = [box];
  const edges = [{ from: "event:SessionStart", to: id, kind: "fires" }];
  const lines = body.split(/\r?\n/);
  const rowBase = id.slice("claude-md:".length);
  let n = 0;
  for (let i = 0; i + 1 < lines.length; i++) {
    if (!lines[i].trim().startsWith("|") || !/^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) continue;
    const header = cells(lines[i]);
    const col = header.findIndex((h) => /enforced by/i.test(h));
    i += 2;
    for (; i < lines.length && lines[i].trim().startsWith("|"); i++) {
      if (col < 0) continue;
      const row = cells(lines[i]);
      const cell = row[col] ?? "";
      const rowId = `row:${rowBase}#${++n}`;
      boxes.push({
        id: rowId,
        kind: "row",
        label: plain(row[col === 0 ? 1 : 0] ?? ""),
        enforcedBy: plain(cell),
        tokens: [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]),
        githooks: [...new Set([...cell.matchAll(GIT_HOOK_MENTION)].map((m) => m[1]))],
        source,
      });
      edges.push({ from: id, to: rowId, kind: "contains" });
    }
  }
  return { boxes, edges };
}
