import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PLUGIN_ROOT } from "./helpers.mjs";
import { loadServer, serverNames, toolFiles } from "../lib/server.mjs";
import { scriptMeta } from "../../env-map/lib/text.mjs";
import { parseResponsibilities } from "../../env-map/lib/gate.mjs";

const ENV_MAP = path.join(PLUGIN_ROOT, "..", "env-map");
const layers = JSON.parse(fs.readFileSync(path.join(ENV_MAP, "config.json"), "utf8")).layers;
const jobs = parseResponsibilities(fs.readFileSync(path.join(ENV_MAP, "responsibilities.yaml"), "utf8"));

test("the servers are dev, request, todo, jira, wt-session, explore-db, db-request and plugin-scripts", () => {
  assert.deepEqual(serverNames(), ["db-request", "dev", "explore-db", "jira", "plugin-scripts", "request", "todo", "wt-session"]);
});

for (const server of serverNames()) {
  test(`${server}: every tool file carries why, layer and takes that env-map reads and its gate accepts`, async () => {
    const tools = await loadServer(server);
    const files = toolFiles(server);
    assert.equal(tools.length, files.length, "one tool per file");
    for (const [i, file] of files.entries()) {
      const tool = tools[i];
      const parsed = scriptMeta(fs.readFileSync(file, "utf8"), ".mjs");
      assert.deepEqual(parsed, tool.meta, `${tool.name}: env-map reads the same meta`);
      assert.ok(tool.meta.why?.length > 10, `${tool.name}: why`);
      assert.ok(layers.includes(tool.meta.layer), `${tool.name}: layer ${tool.meta.layer}`);
      assert.ok(tool.meta.takes.length > 0, `${tool.name}: takes`);
      for (const id of tool.meta.takes) assert.ok(jobs.has(id), `${tool.name}: takes ${id} is in env-map's responsibilities.yaml`);
    }
  });
}

test("tool names are unique across servers", async () => {
  const names = [];
  for (const server of serverNames()) for (const t of await loadServer(server)) names.push(t.name);
  assert.equal(new Set(names).size, names.length);
});
