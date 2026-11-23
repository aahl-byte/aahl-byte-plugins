// The triage file: each report item judged real or pedantic with a one-line reason, and the cleaning list it yields.

const ONE_LINE = 240;
const line = (max, description) => ({ type: "string", minLength: 1, maxLength: max, pattern: "^[^\\n]+$", description });

/** One item's judgment, as the session writes it. */
const VERDICT = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["real", "pedantic"] },
    reason: line(ONE_LINE, "one line: why it is real and worth doing, or why it is pedantic"),
    plan: line(2 * ONE_LINE, "real items: one line saying what the cleaner changes"),
    question: line(2 * ONE_LINE, "only when a person must decide first; the item is not cleaned this round"),
    rank: { type: "integer", minimum: 1, description: "real items: cleaning order, 1 first" },
  },
  required: ["verdict", "reason"],
  additionalProperties: false,
};

/**
 * The schema handed to `claude -p --json-schema` for one report: an object with exactly one entry per report id,
 * so no id is repeated or left out. Claude checks it inside the session, so the session fixes a violation itself.
 */
export function triageSchema(report) {
  const ids = report.items.map((i) => i.id);
  return {
    type: "object",
    $defs: { verdict: VERDICT },
    properties: {
      items: {
        type: "object",
        properties: Object.fromEntries(ids.map((id) => [id, { $ref: "#/$defs/verdict" }])),
        required: ids,
        additionalProperties: false,
      },
    },
    required: ["items"],
    additionalProperties: false,
  };
}

const order = (t) => (t.verdict === "real" && !t.question ? (t.rank ?? Number.MAX_SAFE_INTEGER) : Infinity);

/** The session's id-keyed answer as the triage file's list: ranked real items first, then the rest in report order. */
export function fromAnswer(answer, report) {
  if (!answer?.items || typeof answer.items !== "object") return { items: null };
  const position = new Map(report.items.map((i, n) => [i.id, n]));
  const items = Object.entries(answer.items).map(([id, v]) => ({ id, ...v }));
  return { items: items.sort((a, b) => order(a) - order(b) || (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0)) };
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
    if (t.rank !== undefined && !(Number.isInteger(t.rank) && t.rank >= 1)) errors.push(`${at}: rank must be a whole number from 1`);
  });
  for (const id of known) if (!seen.has(id)) errors.push(`${id} is not triaged`);
  return errors;
}

/** The real items with no open question, ranked first and then in triage order, each with its report item; `only` picks and orders a subset. */
export function cleaningList(triage, report, only) {
  const byId = new Map(report.items.map((i) => [i.id, i]));
  const list = triage.items
    .map((t, n) => ({ ...t, n }))
    .filter((t) => t.verdict === "real" && !t.question)
    .sort((a, b) => order(a) - order(b) || a.n - b.n)
    .map(({ n, ...t }) => ({ ...t, item: byId.get(t.id) }));
  if (!only?.length) return list;
  return only.map((id) => {
    const found = list.find((t) => t.id === id);
    if (!found) throw new Error(`${id} is not on the cleaning list (it is pedantic, waits on a question, or is not in the report)`);
    return found;
  });
}
