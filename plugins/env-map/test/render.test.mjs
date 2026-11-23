import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { goldenEnv, mapEnv } from "./helpers/env.mjs";
import { renderPage, GENERATED_LINE } from "../lib/render.mjs";

const ELK = fs.readFileSync(new URL("../vendor/elk.bundled.js", import.meta.url), "utf8");

function page(at) {
  const graph = mapEnv(goldenEnv());
  return { graph, html: renderPage({ graph, baselines: [], generatedAt: at, project: "repo" }) };
}

test("the page carries ELK, the graph and the client inline and loads nothing from the network", () => {
  const { graph, html } = page("2026-11-23T08:00:00.000Z");
  assert.ok(html.includes(ELK.slice(0, 2000)), "ELK bundle is inlined");
  const data = /<script id="env-map-data" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  assert.ok(data, "graph data block present");
  assert.deepEqual(JSON.parse(data[1]).graph.boxes.length, graph.boxes.length);
  assert.doesNotMatch(html, /<script[^>]+src=/);
  assert.doesNotMatch(html, /<link[^>]+href=/);
  assert.doesNotMatch(html, /url\(\s*['"]?https?:/);
  for (const view of ["lifecycle", "responsibilities", "dependencies", "compare"]) assert.match(html, new RegExp(`data-view="${view}"`));
});

test("a box label holding </script> cannot end the data block early", () => {
  const graph = mapEnv(goldenEnv());
  graph.boxes[0].label = "</script><script>alert(1)</script>";
  const html = renderPage({ graph, baselines: [], generatedAt: "x", project: "repo" });
  assert.equal(html.match(/<\/script>/g).length, html.match(/<script/g).length);
});

test("two renders of the same graph differ only on the generated line", () => {
  const graph = mapEnv(goldenEnv());
  const render = (at) => renderPage({ graph, baselines: [], generatedAt: at, project: "repo" }).split("\n");
  const a = render("2026-11-23T08:00:00.000Z");
  const b = render("2026-11-24T09:30:00.000Z");
  assert.equal(a.length, b.length);
  const differing = a.map((line, i) => [line, b[i]]).filter(([x, y]) => x !== y);
  assert.equal(differing.length, 1);
  assert.match(differing[0][0], GENERATED_LINE);
});
