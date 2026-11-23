import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { checkFlags, discoveryMessage } from "../check.mjs";
import { DOORS_DIR, fixtureRepo } from "./helpers.mjs";

const flag = (result, id) => result.flags.find((f) => f.id === id);
const pick = (authorities) => authorities.map(({ door, file, source }) => ({ door, file, source }));

test("observed authorities are the doors that use the flag's pattern, listed after the declared ones", () => {
  const result = checkFlags(fixtureRepo());
  assert.deepEqual(pick(flag(result, "raw-input").authorities), [
    { door: "NoteComposer", file: "src/components/NoteComposer.tsx", source: "declared" },
    { door: "input", file: "src/components/ui/input.tsx", source: "observed" },
    { door: "TextInput", file: "src/components/TextInput.tsx", source: "observed" },
  ]);
});

test("a declared authority that is also observed appears once, with the declared why and the observed file", () => {
  const result = checkFlags(fixtureRepo());
  assert.deepEqual(flag(result, "create-finding").authorities, [
    { door: "NewFindingForm", file: "src/components/NewFindingForm.tsx", why: "the form that creates a finding with its photos", source: "declared" },
  ]);
});

test("each authority's purpose comes from its why: the meta export, a why comment, or its door folder", () => {
  const whys = Object.fromEntries(flag(checkFlags(fixtureRepo()), "raw-input").authorities.map((a) => [a.door, a.why]));
  assert.deepEqual(whys, {
    NoteComposer: "a note that sends on Enter and saves itself",
    input: "vendored primitives: the styled base every control builds on",
    TextInput: "standalone text, e.g. search boxes and toolbars",
  });
});

test("unsigned code using a flagged pattern is a finding; doors using it are not", () => {
  const result = checkFlags(fixtureRepo());
  const where = (id) => flag(result, id).findings.map((f) => `${f.file}:${f.line}`);
  assert.deepEqual(where("raw-input"), ["src/components/ReviewScreen.tsx:6"]);
  assert.deepEqual(where("radix"), ["src/components/ReviewScreen.tsx:1"]);
  assert.deepEqual(where("create-finding"), ["src/components/QuickAdd.tsx:4"]);
});

test("the discovery message names the spot, lists each authority with its purpose, then asks the questions", () => {
  const message = discoveryMessage(flag(checkFlags(fixtureRepo()), "raw-input"));
  assert.equal(
    message,
    [
      "✗ <input> at src/components/ReviewScreen.tsx:6 isn't signed.",
      "",
      "Components that own <input>:",
      "  NoteComposer  a note that sends on Enter and saves itself (src/components/NoteComposer.tsx)",
      "  input         vendored primitives: the styled base every control builds on (src/components/ui/input.tsx)",
      "  TextInput     standalone text, e.g. search boxes and toolbars (src/components/TextInput.tsx)",
      "",
      "Questions:",
      "  • Does this value save on its own, or with other fields?",
      "  • Is it inside a table row?",
    ].join("\n")
  );
});

test("a flag with no authority yet says so and still asks its questions", () => {
  const message = discoveryMessage(flag(checkFlags(fixtureRepo()), "radix"));
  assert.match(message, /^✗ @radix-ui\/\* at src\/components\/ReviewScreen\.tsx:1 isn't signed\.\n\nNo component owns @radix-ui\/\* yet\.\n\nQuestions:\n  • Which ui component already wraps this primitive\?$/);
});

test("endpoint flags read the e2e request log: signed senders are authorities, unsigned requests are findings", () => {
  const f = flag(checkFlags(fixtureRepo()), "post-findings");
  assert.deepEqual(pick(f.authorities), [{ door: "NewFindingForm", file: "src/components/NewFindingForm.tsx", source: "observed" }]);
  assert.deepEqual(
    f.findings.map(({ file, test, text }) => ({ file, test, text })),
    [{ file: "e2e/quick-add.spec.ts", test: "adds a finding from the toolbar", text: "POST /api/findings" }]
  );
  assert.match(discoveryMessage(f), /^✗ POST \/api\/findings from e2e\/quick-add\.spec\.ts \("adds a finding from the toolbar"\) isn't signed\./);
});

test("a hand-written signature and a door name signed in two files are forged", () => {
  const forged = checkFlags(fixtureRepo()).forged.map(({ file, line, reason }) => `${file}:${line ?? "-"} ${reason}`);
  assert.deepEqual(forged, [
    'src/components/Forged.tsx:- door name "TextInput" is signed in src/components/Forged.tsx and src/components/TextInput.tsx; a name belongs to one door',
    "src/components/Forged.tsx:6 a signature written by hand; only the signing helper writes data-door and X-Door",
  ]);
});

test("an invalid flag is reported and skipped; the rest still run", () => {
  const repo = fixtureRepo("fixture", (dir) => {
    const file = path.join(dir, "doors/flags.json");
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    data.flags.push({ id: "broken", kind: "element", pattern: "JSXOpeningElement[", why: "x", questions: ["y?"] });
    data.flags.push({ id: "no-questions", kind: "element", pattern: "select", why: "x", questions: [] });
    fs.writeFileSync(file, JSON.stringify(data));
  });
  const result = checkFlags(repo);
  assert.equal(result.errors.length, 2);
  assert.match(result.errors.join("\n"), /broken.*not a valid selector/);
  assert.match(result.errors.join("\n"), /no-questions.*probing question/);
  assert.equal(flag(result, "raw-input").findings.length, 1);
});

test("--files limits findings to those files while authorities still come from the whole repo", () => {
  const result = checkFlags(fixtureRepo(), { files: ["src/components/QuickAdd.tsx"] });
  assert.deepEqual(flag(result, "raw-input").findings, []);
  assert.equal(flag(result, "raw-input").authorities.length, 3);
  assert.equal(flag(result, "create-finding").findings.length, 1);
});

const cli = (args) => spawnSync(process.execPath, [path.join(DOORS_DIR, "check.mjs"), ...args], { encoding: "utf8" });

test("the CLI exits 1 on findings, prints the discovery messages and writes JSON", () => {
  const repo = fixtureRepo();
  const out = path.join(repo, "out.json");
  const r = cli(["--repo", repo, "--json", out]);
  assert.equal(r.status, 1, r.stderr);
  assert.match(r.stdout, /✗ <input> at src\/components\/ReviewScreen\.tsx:6 isn't signed\./);
  assert.match(r.stdout, /doors: 4 findings across 4 flags, 2 forged/);
  const json = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.deepEqual(json.flags.map((f) => [f.id, f.findings.length]), [["raw-input", 1], ["radix", 1], ["create-finding", 1], ["post-findings", 1]]);
});

test("the CLI exits 0 with --report-only, and 0 with nothing to report", () => {
  assert.equal(cli(["--repo", fixtureRepo(), "--report-only"]).status, 0);
  const clean = fixtureRepo("fixture", (dir) => fs.writeFileSync(path.join(dir, "doors/flags.json"), '{ "flags": [] }'));
  fs.rmSync(path.join(clean, "src/components/Forged.tsx"));
  const r = cli(["--repo", clean]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /doors: no findings \(0 flags, 4 doors\)/);
});
