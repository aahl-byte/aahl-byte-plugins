import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isDataChanging, recordDoorRequests, recordRequest, templatePath, writeRequestLog } from "../templates/doorRequests.ts";
import { readRequestLog } from "../lib/requests.mjs";

const where = { spec: "e2e/review.spec.ts", test: "saves the review" };
const req = (method, url, headers = {}, postData = null) => ({ method, url, headers, postData });
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "door-requests-"));

test("only POST, PUT, PATCH and DELETE are data-changing", () => {
  assert.deepEqual(["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE", "post"].map(isDataChanging), [false, false, false, true, true, true, true, true]);
});

test("ids and tokens in a path become placeholders and the query is dropped, so one endpoint is one entry", () => {
  assert.equal(templatePath("/api/findings/123/approval"), "/api/findings/:id/approval");
  assert.equal(templatePath("/api/photos/0b6f4f0e-3c55-4f7b-9d3c-0d1f6f5c1a2b"), "/api/photos/:id");
  assert.equal(templatePath("/report/abcdefghij0123456789xyz"), "/report/:token");
  assert.equal(templatePath("/api/inspections"), "/api/inspections");
});

test("a request carries its X-Door header as the door, null when unsigned; repeats are counted", () => {
  const log = new Map();
  recordRequest(log, req("POST", "http://localhost:3417/api/findings", { "x-door": "NewFindingForm" }), where, "http://localhost:3417");
  recordRequest(log, req("PATCH", "http://localhost:3417/api/inspections/9?step=2"), where, "http://localhost:3417");
  recordRequest(log, req("PATCH", "http://localhost:3417/api/inspections/10"), where, "http://localhost:3417");
  recordRequest(log, req("GET", "http://localhost:3417/api/inspections/10"), where, "http://localhost:3417");
  recordRequest(log, req("POST", "https://login.microsoftonline.com/token"), where, "http://localhost:3417");
  assert.deepEqual([...log.values()], [
    { method: "POST", path: "/api/findings", door: "NewFindingForm", spec: "e2e/review.spec.ts", test: "saves the review", count: 1 },
    { method: "PATCH", path: "/api/inspections/:id", door: null, spec: "e2e/review.spec.ts", test: "saves the review", count: 2 },
  ]);
});

test("a server action signed with a bound door stamp is attributed to that door", () => {
  const log = new Map();
  const body = JSON.stringify([{ door: "NewFindingForm" }, { title: "x" }]);
  recordRequest(log, req("POST", "http://localhost:3417/review/12", { "next-action": "7f3a" }, body), where);
  recordRequest(log, req("POST", "http://localhost:3417/review/12", { "next-action": "7f3a" }, JSON.stringify([{ title: "x" }])), where);
  assert.deepEqual(
    [...log.values()].map(({ path, door }) => ({ path, door })),
    [
      { path: "/review/:id [action 7f3a]", door: "NewFindingForm" },
      { path: "/review/:id [action 7f3a]", door: null },
    ]
  );
});

test("the log file is the JSON the checker and the report read back", () => {
  const dir = tmp();
  const log = new Map();
  recordRequest(log, req("DELETE", "http://localhost:3417/api/findings/4"), where);
  recordRequest(log, req("POST", "http://localhost:3417/api/findings", { "X-Door": "NewFindingForm" }), where);
  const file = writeRequestLog(dir, log, "w1");
  assert.equal(path.dirname(file), dir);
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(json.version, 1);
  assert.deepEqual(json.requests.map((r) => `${r.method} ${r.path} ${r.door}`), ["DELETE /api/findings/:id null", "POST /api/findings NewFindingForm"]);
  assert.deepEqual(readRequestLog("/", dir).map((r) => r.door), [null, "NewFindingForm"]);
});

test("the fixture records the page's requests during a test, writes the worker's file, and never fails the test", async () => {
  const dir = tmp();
  const listeners = new Set();
  const context = { on: (_e, fn) => listeners.add(fn), off: (_e, fn) => listeners.delete(fn) };
  const fire = (method, url, headers = {}) =>
    [...listeners].forEach((fn) => fn({ method: () => method, url: () => url, headers: () => headers, postData: () => null }));
  const testInfo = { file: path.join(process.cwd(), "e2e/review.spec.ts"), title: "saves the review" };
  await recordDoorRequests({ context, baseURL: "http://localhost:3417" }, async () => fire("PUT", "http://localhost:3417/api/x/1"), testInfo, dir);
  assert.equal(listeners.size, 0, "the listener is removed after the test");
  const [file] = fs.readdirSync(dir);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")).requests, [
    { method: "PUT", path: "/api/x/:id", door: null, spec: "e2e/review.spec.ts", test: "saves the review", count: 1 },
  ]);

  const unwritable = path.join(dir, file, "nested");
  await recordDoorRequests({ context, baseURL: undefined }, async () => fire("POST", "http://localhost:3417/api/y"), testInfo, unwritable);
});
