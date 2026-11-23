// The six pattern flags. Each is a fixed rule over the graph; thresholds come from config.json.
const DAY = 86400000;

function matches(pattern, text) {
  try {
    return new RegExp(pattern.source, pattern.flags).test(text);
  } catch {
    return false;
  }
}

function matcherHits(matcher, tool) {
  if (!matcher || matcher === "*") return true;
  try {
    return new RegExp(`^(?:${matcher})$`).test(tool);
  } catch {
    return matcher === tool;
  }
}

export function computeFlags(graph, config) {
  const { boxes, edges } = graph;
  const flags = [];
  const add = (flag, box, detail) => flags.push({ flag, box, detail });
  const incoming = (id, kind) => edges.some((e) => e.to === id && e.kind === kind);

  // Crowded event: more than N hooks on one event.
  const max = config.flags.crowdedEvent.maxHooks;
  for (const ev of boxes.filter((b) => b.kind === "event")) {
    const n = boxes.filter((b) => b.kind === "hook" && `event:${b.event}` === ev.id).length;
    if (n > max) add("crowded-event", ev.id, `${n} hooks (more than ${max})`);
  }

  // Overlap: two rules match the same command.
  const patterned = boxes.filter((b) => b.pattern && (b.kind === "rule" || b.kind === "deny"));
  for (let i = 0; i < patterned.length; i++) {
    for (let j = i + 1; j < patterned.length; j++) {
      const [a, b] = [patterned[i], patterned[j]];
      if (a.pattern.tool && b.pattern.tool && a.pattern.tool !== b.pattern.tool) continue;
      const sample = [a.pattern.sample, b.pattern.sample].find(
        (s, k) => s != null && matches(k === 0 ? b.pattern : a.pattern, s)
      );
      if (sample == null) continue;
      add("overlap", a.id, `overlaps ${b.id} on "${sample}"`);
      add("overlap", b.id, `overlaps ${a.id} on "${sample}"`);
    }
  }

  // Unenforced prose: a CLAUDE.md row with no enforcer, or a prose-layer skill changed recently.
  const asOf = graph.asOf ? Date.parse(graph.asOf) : null;
  const recent = config.flags.unenforcedProse.recentDays;
  for (const b of boxes) {
    if (b.kind === "row" && !b.enforced) add("unenforced-prose", b.id, "CLAUDE.md row with no enforcer");
    if (b.kind === "skill" && b.layer === "prose" && b.git && asOf !== null && asOf - Date.parse(b.git.last) <= recent * DAY) {
      add("unenforced-prose", b.id, `prose-layer skill changed ${b.git.last} (within ${recent} days)`);
    }
  }

  // Churn: more than K changes to one file within W days.
  const { maxChanges, windowDays } = config.flags.churn;
  for (const b of boxes) {
    if (b.git && b.git.inWindow > maxChanges) add("churn", b.id, `${b.git.inWindow} changes in ${windowDays} days (more than ${maxChanges})`);
  }

  // Cross-boundary edge: an external hook on a tool event whose matcher covers Bash.
  for (const b of boxes) {
    if (b.kind === "hook" && b.owner === "external" && config.toolEvents.includes(b.event) && matcherHits(b.matcher, "Bash")) {
      add("cross-boundary", b.id, `external ${b.event} hook on ${b.matcher || "*"} acts on repo commands`);
    }
  }

  // Orphan: a script nothing calls, or a skill nothing names and the model cannot trigger.
  for (const b of boxes) {
    if (b.kind === "script" && !incoming(b.id, "calls")) add("orphan", b.id, "nothing calls this script");
    if (b.kind === "skill" && !b.triggerable && !incoming(b.id, "names")) add("orphan", b.id, "no description to trigger it and nothing names it");
  }

  return flags.sort((x, y) => (x.flag + "\0" + x.box + "\0" + x.detail < y.flag + "\0" + y.box + "\0" + y.detail ? -1 : 1));
}
