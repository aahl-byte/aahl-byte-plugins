import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { goldenEnv, mapEnv, slug } from "./helpers/env.mjs";
import { toJson } from "../lib/graph.mjs";

test("the golden fixture environment produces the expected graph.json", () => {
  const env = goldenEnv();
  const actual = toJson(mapEnv(env)).replaceAll(env.T, "<T>").replaceAll(slug(env.T), "<TSLUG>");
  const expected = fs.readFileSync(new URL("./golden/graph.json", import.meta.url), "utf8");
  assert.equal(actual, expected);
});
