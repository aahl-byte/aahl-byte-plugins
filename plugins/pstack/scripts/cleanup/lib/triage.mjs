// The triage file: each report item judged real or pedantic with a one-line reason, and the cleaning list it yields.

const ONE_LINE = 240;

/** Handed to `claude -p --json-schema`, so the triage session's structured output has this shape. */
export const TRIAGE_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "the report item's id" },
          verdict: { type: "string", enum: ["real", "pedantic"] },
          reason: { type: "string", description: "one line: why it is real and worth doing, or why it is pedantic" },
          plan: { type: "string", description: "real items: one line saying what the cleaner changes" },
          question: { type: "string", description: "only when a person must decide first; the item is not cleaned this round" },
        },
        required: ["id", "verdict", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

/**
 * The base schema narrowed to one report: ids from the report, one entry per item, and the one-line limits.
 * Claude checks structured output against it inside the session, so the session fixes a violation itself.
 */
export function triageSchema(report) {
  const base = TRIAGE_SCHEMA.properties.items;
  const props = base.items.properties;
  const line = (max) => ({ maxLength: max, pattern: "^[^\\n]+$" });
  return {
    ...TRIAGE_SCHEMA,
    properties: {
      items: {
        ...base,
        minItems: report.items.length,
        maxItems: report.items.length,
        items: {
          ...base.items,
          properties: {
            ...props,
            id: { ...props.id, enum: report.items.map((i) => i.id) },
            reason: { ...props.reason, ...line(ONE_LINE) },
            plan: { ...props.plan, ...line(2 * ONE_LINE) },
            question: { ...props.question, ...line(2 * ONE_LINE) },
          },
        },
      },
    },
  };
}

const oneLine = (s, max = ONE_LINE) => typeof s === "string" && s.trim().length > 0 && !s.includes("\n") && s.length <= max;

/** Every problem with a triage against its report, as messages; empty when valid. */
export function validateTriage(triage, report) {
  const errors = [];
  if (!triage || !Array.isArray(triage.items)) return ["triage must have an items array"];
  const known = new Set(report.items.map((i) => i.id));
  const seen = new Set();
  triage.items.forEach((t, i) => {
    const at = `items[${i}]${t?.id ? ` (${t.id})` : ""}`;
    if (!known.has(t?.id)) {
      errors.push(`items[${i}]: ${t?.id ?? "(no id)"} is not in the report`);
      return;
    }
    if (seen.has(t.id)) {
      errors.push(`items[${i}]: ${t.id} is triaged twice`);
      return;
    }
    seen.add(t.id);
    if (t.verdict !== "real" && t.verdict !== "pedantic") errors.push(`${at}: verdict must be real or pedantic`);
    if (!oneLine(t.reason)) errors.push(`${at}: reason must be one line of at most ${ONE_LINE} characters`);
    if (t.verdict === "real" && !oneLine(t.plan, 2 * ONE_LINE)) errors.push(`${at}: a real item needs a one-line plan`);
    if (t.question !== undefined && !oneLine(t.question, 2 * ONE_LINE)) errors.push(`${at}: question must be one line`);
  });
  for (const id of known) if (!seen.has(id)) errors.push(`${id} is not triaged`);
  return errors;
}

/** The real items with no open question, in triage order, each with its report item; `only` picks and orders a subset. */
export function cleaningList(triage, report, only) {
  const byId = new Map(report.items.map((i) => [i.id, i]));
  const list = triage.items.filter((t) => t.verdict === "real" && !t.question).map((t) => ({ ...t, item: byId.get(t.id) }));
  if (!only?.length) return list;
  return only.map((id) => {
    const found = list.find((t) => t.id === id);
    if (!found) throw new Error(`${id} is not on the cleaning list (it is pedantic, waits on a question, or is not in the report)`);
    return found;
  });
}
