import { test } from "node:test";
import assert from "node:assert/strict";
import { cleaningList, TRIAGE_SCHEMA, validateTriage } from "../lib/triage.mjs";

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

test("--items narrows the cleaning list and keeps the order asked for", () => {
  const t = good();
  t.items[1] = { id: "dup-1", verdict: "real", reason: "the same parse in two routes", plan: "fold into one helper" };
  assert.deepEqual(cleaningList(t, report, ["dup-1", "raw-x"]).map((i) => i.id), ["dup-1", "raw-x"]);
  assert.throws(() => cleaningList(t, report, ["seed-logging"]), /seed-logging is not on the cleaning list/);
});

test("the schema handed to claude --json-schema asks for the same fields the validator checks", () => {
  const item = TRIAGE_SCHEMA.properties.items.items;
  assert.deepEqual(TRIAGE_SCHEMA.required, ["items"]);
  assert.deepEqual(item.required, ["id", "verdict", "reason"]);
  assert.deepEqual(item.properties.verdict.enum, ["real", "pedantic"]);
  assert.deepEqual(Object.keys(item.properties).sort(), ["id", "plan", "question", "reason", "verdict"]);
  assert.equal(item.additionalProperties, false);
});
