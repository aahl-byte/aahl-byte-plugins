import { test } from "node:test";
import assert from "node:assert/strict";
import { cleaningList, fromAnswer, triageSchema, validateTriage } from "../lib/triage.mjs";

const report = { items: [{ id: "dup-1", size: { files: 2, lines: 20 } }, { id: "raw-x", size: { files: 1, lines: 3 } }, { id: "seed-logging", size: { files: 0, lines: 0 } }] };
const good = () => ({
  items: [
    { id: "raw-x", verdict: "real", reason: "three raw buttons duplicate the Button door's styles", plan: "render the Button door in place of the raw buttons" },
    { id: "dup-1", verdict: "pedantic", reason: "two route files share four lines of Next boilerplate" },
    { id: "seed-logging", verdict: "real", reason: "console calls leak to the browser", plan: "adopt a logger", question: "Which logger, or keep console?" },
  ],
});

test("a triage covering every report item with a verdict and a one-line reason is valid", () => {
  assert.deepEqual(validateTriage(good(), report), []);
});

test("a missing, unknown or repeated id is an error", () => {
  const t = good();
  t.items[1].id = "dup-9";
  t.items.push({ ...t.items[0] });
  assert.deepEqual(validateTriage(t, report), ["items[1]: dup-9 is not in the report", "items[3]: raw-x is triaged twice", "dup-1 is not triaged"]);
});

test("the verdict is real or pedantic, and every item gives its reason on one line", () => {
  const t = good();
  t.items[0].verdict = "maybe";
  t.items[1].reason = "";
  t.items[2].reason = "line one\nline two";
  assert.deepEqual(validateTriage(t, report), [
    "items[0] (raw-x): verdict must be real or pedantic",
    "items[1] (dup-1): reason must be one line of at most 240 characters",
    "items[2] (seed-logging): reason must be one line of at most 240 characters",
  ]);
});

test("a real item says in one line what the cleaner will do", () => {
  const t = good();
  delete t.items[0].plan;
  assert.deepEqual(validateTriage(t, report), ["items[0] (raw-x): a real item needs a one-line plan"]);
});

test("the cleaning list is the real items with no open question, in triage order, joined to their report item", () => {
  const list = cleaningList(good(), report);
  assert.deepEqual(list.map((i) => [i.id, i.item.size.lines]), [["raw-x", 3]]);
});

test("a rank orders the cleaning list, 1 first; unranked real items follow in triage order", () => {
  const t = good();
  t.items[1] = { id: "dup-1", verdict: "real", reason: "the same parse in two routes", plan: "fold into one helper", rank: 1 };
  t.items[0].rank = 2;
  assert.deepEqual(cleaningList(t, report).map((i) => i.id), ["dup-1", "raw-x"]);
  t.items[0].rank = 0;
  assert.deepEqual(validateTriage(t, report), ["items[0] (raw-x): rank must be a whole number from 1"]);
});

test("--items narrows the cleaning list and keeps the order asked for", () => {
  const t = good();
  t.items[1] = { id: "dup-1", verdict: "real", reason: "the same parse in two routes", plan: "fold into one helper" };
  assert.deepEqual(cleaningList(t, report, ["dup-1", "raw-x"]).map((i) => i.id), ["dup-1", "raw-x"]);
  assert.throws(() => cleaningList(t, report, ["seed-logging"]), /seed-logging is not on the cleaning list/);
});

test("the session answers one entry per report id, so no id can be repeated or left out, with the one-line limits in the schema", () => {
  const schema = triageSchema(report);
  const items = schema.properties.items;
  assert.deepEqual(Object.keys(items.properties), ["dup-1", "raw-x", "seed-logging"]);
  assert.deepEqual(items.required, ["dup-1", "raw-x", "seed-logging"]);
  assert.equal(items.additionalProperties, false);
  for (const id of items.required) assert.deepEqual(items.properties[id], { $ref: "#/$defs/verdict" });
  const verdict = schema.$defs.verdict;
  assert.deepEqual(verdict.required, ["verdict", "reason"]);
  assert.deepEqual(verdict.properties.verdict.enum, ["real", "pedantic"]);
  assert.deepEqual(Object.keys(verdict.properties).sort(), ["plan", "question", "rank", "reason", "verdict"]);
  assert.equal(verdict.properties.reason.maxLength, 240);
  assert.equal(verdict.properties.reason.pattern, "^[^\\n]+$");
  assert.equal(verdict.properties.plan.maxLength, 480);
  assert.equal(verdict.additionalProperties, false);
});

test("the session's answer becomes the triage file: one entry per item, ranked real items first", () => {
  const answer = {
    items: {
      "seed-logging": { verdict: "pedantic", reason: "no logger is needed yet" },
      "raw-x": { verdict: "real", reason: "raw buttons copy the door's styles", plan: "render the Button door", rank: 2 },
      "dup-1": { verdict: "real", reason: "the same parse in two routes", plan: "fold into one helper", rank: 1 },
    },
  };
  const t = fromAnswer(answer, report);
  assert.deepEqual(t.items.map((i) => i.id), ["dup-1", "raw-x", "seed-logging"]);
  assert.deepEqual(t.items[0], { id: "dup-1", verdict: "real", reason: "the same parse in two routes", plan: "fold into one helper", rank: 1 });
  assert.deepEqual(validateTriage(t, report), []);
  assert.deepEqual(fromAnswer(null, report), { items: null });
});
