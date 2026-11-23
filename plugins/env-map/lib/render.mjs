// Writes the single self-contained page: graph data, ELK and the client inline, nothing fetched at view time.
import fs from "node:fs";
import { loadConfig } from "./config.mjs";
import { parseResponsibilities } from "./gate.mjs";

const asset = (rel) => fs.readFileSync(new URL(rel, import.meta.url), "utf8");

export const GENERATED_LINE = /^<p class="generated">Generated .*<\/p>$/;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const jsonInHtml = (value) => JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
const scriptInHtml = (src) => src.replace(/<\/(script)/gi, "<\\/$1");

const VIEWS = [
  ["lifecycle", "Lifecycle", "What runs when?", "Each event in the order a session meets it, with every hook, deny rule, CLAUDE.md and git hook it fires, and the rules inside each hook's script. Colour is the layer; a dashed border is external."],
  ["responsibilities", "Responsibilities", "Who holds each job?", "One column per layer. Each job a part takes sits in the column of the part that holds it; parts with no layer yet sit in their own column."],
  ["dependencies", "Dependencies", "What breaks if this breaks?", "The whole graph. Click a box: everything that would go unchecked turns red, and the events that reach it turn purple."],
  ["compare", "Compare", "What changed?", "Pick a git ref, a day-count before HEAD or a snapshot date above. Every view outlines added boxes in green and removed ones in red; moved jobs get an arrow in Responsibilities."],
];

export function renderPage({ graph, baselines, generatedAt, project, config = loadConfig(), responsibilities }) {
  const jobs = responsibilities ?? parseResponsibilities(asset("../responsibilities.yaml"));
  const data = {
    project,
    graph,
    baselines,
    config: { layers: config.layers, flags: config.flags },
    responsibilities: Object.fromEntries(jobs),
  };
  const sources = graph.sources
    .map((s) => `<tr><td>${esc(s.id)}</td><td class="${s.status === "error" ? "status-error" : ""}">${esc(s.status)}${s.error ? `: ${esc(s.error)}` : ""}${s.note ? ` (${esc(s.note)})` : ""}</td></tr>`)
    .join("\n");
  const legend = [...config.layers, "none"].map((l) => `<span><i style="background: var(--layer-${l})"></i>${l === "none" ? "no layer" : l}</span>`).join("");
  const views = VIEWS.map(
    ([id, , question, lede]) => `<section class="view" data-view="${id}" id="view-${id}">
<h2>${esc(question)}</h2>
<p class="lede">${esc(lede)}</p>
<div class="legend">${legend}<span><i style="background: var(--removed)"></i>red box: unreadable or missing</span></div>
${id === "compare" ? '<div id="compare-summary"></div>' : ""}
<div class="canvas" id="canvas-${id}"></div>
${id === "dependencies" ? '<div class="canvas" id="canvas-loose"></div>' : ""}
</section>`
  ).join("\n");
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>env-map · ${esc(project)}</title>`,
    `<style>\n${asset("../assets/style.css")}</style>`,
    "</head>",
    '<body data-ready="0">',
    "<header>",
    `<h1>env-map <span>${esc(project)}</span></h1>`,
    `<nav>${VIEWS.map(([id, name]) => `<button type="button" data-target="${id}" aria-selected="false">${esc(name)}</button>`).join("")}</nav>`,
    '<div class="tools"><label>Compare to <select id="baseline"><option value="">nothing</option></select></label>',
    '<label>or date <input type="date" id="compare-date"></label>',
    '<button type="button" id="fit">Fit to width</button></div>',
    "</header>",
    "<main>",
    `<div>\n${views}\n</div>`,
    '<aside><h3>Selected</h3><div id="details"></div><div id="flags"></div></aside>',
    "</main>",
    "<footer>",
    `<p class="generated">Generated ${esc(generatedAt)}</p>`,
    `<p>Built from git and files only. Repo facts as of commit date ${esc(graph.asOf ?? "n/a")}. Global config dirs read: ${esc(graph.configDirs.join(", ") || "none")}.</p>`,
    `<details><summary>${graph.sources.length} sources read</summary><table>\n${sources}\n</table></details>`,
    "</footer>",
    `<script id="env-map-data" type="application/json">${jsonInHtml(data)}</script>`,
    `<script>\n${scriptInHtml(asset("../vendor/elk.bundled.js"))}\n</script>`,
    `<script>\n${scriptInHtml(asset("./diff.mjs").replace(/^export /gm, ""))}\n${scriptInHtml(asset("../assets/client.js"))}</script>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}
