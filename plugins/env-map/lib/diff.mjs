// Compares the current graph with a baseline. Also inlined into the page, so it uses no imports.
export function diffGraphs(current, base) {
  const baseIds = new Set(base.boxes.map((b) => b.id));
  const currentIds = new Set(current.boxes.map((b) => b.id));
  const added = current.boxes.filter((b) => b.kind !== "event" && !baseIds.has(b.id)).map((b) => b.id).sort();
  const removed = base.boxes.filter((b) => b.kind !== "event" && !currentIds.has(b.id)).map((b) => b.id).sort();
  const holders = (graph) => {
    const map = new Map();
    for (const b of graph.boxes) for (const t of b.takes ?? []) (map.get(t) ?? map.set(t, []).get(t)).push(b.id);
    return map;
  };
  const now = holders(current);
  const then = holders(base);
  const moved = [];
  for (const takes of [...now.keys()].sort()) {
    const to = now.get(takes).sort();
    const from = (then.get(takes) ?? []).sort();
    if (from.length && from.join("\n") !== to.join("\n")) moved.push({ takes, from, to });
  }
  return { added, removed, moved };
}
