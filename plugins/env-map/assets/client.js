/* global ELK, diffGraphs */
(function main() {
  const DATA = JSON.parse(document.getElementById("env-map-data").textContent);
  const { graph, baselines, config, responsibilities } = DATA;
  const elk = new ELK();
  const NS = "http://www.w3.org/2000/svg";
  const PART_KINDS = new Set(["script", "rule", "githook", "skill", "agent", "claude-md", "memory"]);
  const FLAG_INFO = {
    "crowded-event": { short: "C", title: "Crowded event", about: `More than ${config.flags.crowdedEvent.maxHooks} hooks on one event.` },
    overlap: { short: "O", title: "Overlap", about: "Two rules match the same command." },
    "unenforced-prose": { short: "P", title: "Unenforced prose", about: `A CLAUDE.md row with no enforcer, or a prose-layer skill changed within ${config.flags.unenforcedProse.recentDays} days.` },
    churn: { short: "H", title: "Churn", about: `More than ${config.flags.churn.maxChanges} changes to one file within ${config.flags.churn.windowDays} days.` },
    "cross-boundary": { short: "X", title: "Cross-boundary edge", about: "An external hook that acts on repo commands." },
    orphan: { short: "∅", title: "Orphan", about: "A script nothing calls, or a skill nothing names or triggers." },
  };
  const state = { view: "lifecycle", baseline: "", selected: null };
  const byId = new Map(graph.boxes.map((b) => [b.id, b]));
  const flagsByBox = new Map();
  for (const f of graph.flags) (flagsByBox.get(f.box) ?? flagsByBox.set(f.box, []).get(f.box)).push(f);

  // ---------- model for the current comparison ----------
  function model() {
    const base = baselines.find((b) => b.id === state.baseline);
    if (!base) return { boxes: graph.boxes, edges: graph.edges, status: new Map(), moved: [], base: null };
    const diff = diffGraphs(graph, base);
    const status = new Map();
    for (const id of diff.added) status.set(id, "added");
    const removed = base.boxes.filter((b) => diff.removed.includes(b.id));
    for (const b of removed) status.set(b.id, "removed");
    const boxes = [...graph.boxes, ...removed.map((b) => ({ ...b, ghost: true }))];
    const ids = new Set(boxes.map((b) => b.id));
    const removedIds = new Set(diff.removed);
    const extra = base.edges.filter((e) => (removedIds.has(e.from) || removedIds.has(e.to)) && ids.has(e.from) && ids.has(e.to));
    return { boxes, edges: [...graph.edges, ...extra.map((e) => ({ ...e, removed: true }))], status, moved: diff.moved, base, diff };
  }

  // ---------- drawing helpers ----------
  const el = (name, attrs = {}, parent) => {
    const node = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (parent) parent.appendChild(node);
    return node;
  };
  const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  const layerOf = (b) => (config.layers.includes(b.layer) ? b.layer : "none");
  function subFor(b) {
    if (b.kind === "event") return b.event;
    if (b.error) return clip(b.error, 44);
    const where = b.origin === "plugin" ? `${b.root.replace(/^plugin:/, "")} ${b.version ?? ""}`.trim() : b.origin === "global" ? b.root.replace(/^global:/, "") : "repo";
    const extra = b.kind === "hook" && b.matcher ? ` · ${b.matcher}` : "";
    return clip(`${b.kind}${extra} · ${where}`, 44);
  }
  function sizeFor(label, sub) {
    const w = Math.max(clip(label, 34).length * 7.6, clip(sub, 44).length * 6) + 28;
    return { width: Math.round(Math.min(300, Math.max(96, w))), height: 40 };
  }
  function leaf(id, box, overrides = {}) {
    const label = overrides.label ?? box.label;
    const sub = overrides.sub ?? subFor(box);
    return { id, ...sizeFor(label, sub), box, label, sub };
  }

  function drawNode(g, n, x, y, status) {
    const b = n.box;
    const cls = ["node", b.kind];
    if (b.owner === "external") cls.push("external");
    if (b.error || b.kind === "unreadable") cls.push("error");
    if (status) cls.push(status);
    const grp = el("g", { class: cls.join(" "), transform: `translate(${x},${y})`, "data-id": b.id, style: `--c: var(--layer-${layerOf(b)})` }, g);
    el("title", {}, grp).textContent = [b.label, b.why ? `why: ${b.why}` : "", b.error ?? ""].filter(Boolean).join("\n");
    el("rect", { class: "box", width: n.width, height: n.height, rx: 6 }, grp);
    el("text", { class: "label", x: 9, y: 16 }, grp).textContent = clip(n.label, 34);
    el("text", { class: "sub", x: 9, y: 31 }, grp).textContent = clip(n.sub, 44);
    const flags = [...new Set((flagsByBox.get(b.id) ?? []).map((f) => f.flag))];
    flags.forEach((f, i) => {
      const fg = el("g", { class: "flag", transform: `translate(${n.width - 9 - i * 17},0)` }, grp);
      el("circle", { r: 8, cx: 0, cy: 0 }, fg);
      el("text", { x: 0, y: 3.4, "text-anchor": "middle" }, fg).textContent = FLAG_INFO[f]?.short ?? "!";
    });
    grp.addEventListener("click", (ev) => {
      ev.stopPropagation();
      select(b.id);
    });
  }

  function drawEdges(g, edges, dx, dy) {
    for (const e of edges ?? []) {
      if (e.hidden) continue;
      for (const s of e.sections ?? []) {
        const pts = [s.startPoint, ...(s.bendPoints ?? []), s.endPoint].map((p) => `${p.x + dx},${p.y + dy}`);
        const eg = el("g", { class: `edge ${e.kind ?? ""} ${e.cls ?? ""}`, "data-from": e.boxFrom ?? "", "data-to": e.boxTo ?? "" }, g);
        el("path", { d: `M${pts.join("L")}`, "marker-end": "url(#arrow)" }, eg);
      }
    }
  }

  /** Draws an ELK result: groups for compound nodes, boxes for leaves, edges in their container's frame. */
  function drawLayout(g, node, dx, dy, ctx) {
    for (const c of node.children ?? []) {
      const x = dx + c.x;
      const y = dy + c.y;
      if (c.children && c.children.length) {
        const grp = el("g", { class: `group ${c.cls ?? ""}` }, g);
        el("rect", { x, y, width: c.width, height: c.height, rx: 8 }, grp);
        if (c.title) el("text", { class: "title", x: x + 10, y: y + 18 }, grp).textContent = c.title;
        if (c.subtitle) el("text", { class: "subtitle", x: x + 10, y: y + 32 }, grp).textContent = c.subtitle;
        drawLayout(g, c, x, y, ctx);
      } else if (c.box) {
        drawNode(g, c, x, y, c.status ?? ctx.status.get(c.box.id));
      }
    }
    drawEdges(g, node.edges, dx, dy);
  }

  function svgFor(container, width, height) {
    container.textContent = "";
    const svg = el("svg", { viewBox: `0 0 ${Math.ceil(width)} ${Math.ceil(height)}`, width: Math.ceil(width), height: Math.ceil(height), role: "img" }, container);
    const defs = el("defs", {}, svg);
    const marker = el("marker", { id: "arrow", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
    el("path", { d: "M0,0L10,5L0,10z", fill: "var(--edge)" }, marker);
    svg.addEventListener("click", () => select(null));
    return svg;
  }

  const availableWidth = () => Math.max(900, (document.querySelector("main > div")?.clientWidth ?? 1200) - 40);

  /** Places laid-out blocks left to right in the given order, wrapping into rows at the available width. */
  function flow(blocks, gap) {
    const maxW = availableWidth();
    let x = 0;
    let y = 0;
    let rowH = 0;
    const placed = [];
    for (const c of blocks) {
      if (x > 0 && x + c.width > maxW) {
        x = 0;
        y += rowH + gap;
        rowH = 0;
      }
      placed.push({ c, x, y });
      x += c.width + gap;
      rowH = Math.max(rowH, c.height);
    }
    const width = Math.max(...placed.map((p) => p.x + p.c.width), 300) + 16;
    return { placed, width, height: y + rowH + 16 };
  }

  /** Splits boxes into connected components: those holding events first, in event order, then larger ones first. */
  function components(boxes, edges) {
    const parent = new Map(boxes.map((b) => [b.id, b.id]));
    const find = (x) => {
      while (parent.get(x) !== x) x = parent.get(x);
      return x;
    };
    for (const e of edges) if (parent.has(e.from) && parent.has(e.to)) parent.set(find(e.from), find(e.to));
    const sets = new Map();
    for (const b of boxes) (sets.get(find(b.id)) ?? sets.set(find(b.id), []).get(find(b.id))).push(b);
    const firstEvent = (list) => Math.min(...list.filter((b) => b.kind === "event").map((b) => b.order), Infinity);
    return [...sets.values()].sort((a, b) => firstEvent(a) - firstEvent(b) || b.length - a.length || (a[0].id < b[0].id ? -1 : 1));
  }

  /** One ELK layered layout per connected component, flowed into rows. */
  async function layoutComponents(boxes, edges, edgeClass) {
    const laid = await Promise.all(
      components(boxes, edges).map((list, i) => {
        const ids = new Set(list.map((b) => b.id));
        const hasEvent = list.some((b) => b.kind === "event");
        return elk.layout({
          id: `cc${i}`,
          layoutOptions: { ...LAYERED, "elk.edgeRouting": hasEvent ? "ORTHOGONAL" : "POLYLINE", "elk.padding": "[top=8,left=8,bottom=8,right=8]" },
          children: list.map((b) => leaf(b.id, b)),
          edges: edges
            .filter((e) => ids.has(e.from) && ids.has(e.to))
            .map((e, j) => ({ id: `cc${i}e${j}`, sources: [e.from], targets: [e.to], kind: e.kind, cls: edgeClass(e), boxFrom: e.from, boxTo: e.to })),
        });
      })
    );
    return flow(laid, 20);
  }

  function drawFlow(container, f, m) {
    const svg = svgFor(container, f.width, f.height);
    const root = el("g", { transform: "translate(8,8)" }, svg);
    for (const p of f.placed) drawLayout(root, { children: p.c.children, edges: p.c.edges }, p.x, p.y, m);
    return svg;
  }

  const LAYERED = {
    "elk.algorithm": "layered",
    "elk.direction": "RIGHT",
    "elk.spacing.nodeNode": "12",
    "elk.layered.spacing.nodeNodeBetweenLayers": "36",
    "elk.edgeRouting": "ORTHOGONAL",
    "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
  };
  const PAD = "[top=40,left=12,bottom=12,right=12]";
  const groupMin = (title, subtitle) => ({
    "elk.nodeSize.constraints": "MINIMUM_SIZE",
    "elk.nodeSize.minimum": `(${Math.ceil(Math.max(title.length * 7.6, subtitle.length * 6) + 28)}, 48)`,
  });
  const byKindLabel = (a, b) => (a.box.kind + a.label < b.box.kind + b.label ? -1 : 1);

  // ---------- view 1: lifecycle ----------
  async function lifecycle(m) {
    const edges = m.edges;
    const out = (id, kind) => edges.filter((e) => e.from === id && e.kind === kind).map((e) => e.to);
    const boxOf = (id) => m.boxes.find((b) => b.id === id);
    const events = m.boxes.filter((b) => b.kind === "event").sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : 1));
    const columns = [];
    for (const ev of events) {
      const members = out(ev.id, "fires").map(boxOf).filter(Boolean);
      if (!members.length) continue;
      const children = [];
      const colEdges = [];
      for (const b of members) {
        const nid = `${ev.id}|${b.id}`;
        let sub;
        if (b.kind === "githook") sub = `git hook → ${out(b.id, "calls").map((s) => boxOf(s)?.label).join(", ")}`;
        children.push(leaf(nid, b, sub ? { sub: clip(sub, 44) } : {}));
        if (b.kind !== "hook" && b.kind !== "githook") continue;
        for (const sid of out(b.id, "calls")) {
          const script = boxOf(sid);
          if (script?.error) {
            children.push(leaf(`${nid}|${sid}`, script));
            colEdges.push({ id: `${nid}>${sid}`, sources: [nid], targets: [`${nid}|${sid}`], kind: "calls", boxFrom: b.id, boxTo: sid });
          }
          for (const rid of out(sid, "contains")) {
            const rule = boxOf(rid);
            if (!rule) continue;
            children.push(leaf(`${nid}|${rid}`, rule, { sub: clip(`rule · ${script.label}`, 44) }));
            colEdges.push({ id: `${nid}>${rid}`, sources: [nid], targets: [`${nid}|${rid}`], kind: "contains", boxFrom: b.id, boxTo: rid });
          }
        }
      }
      const hooks = members.filter((b) => b.kind === "hook").length;
      columns.push({
        id: `col:${ev.id}`,
        title: ev.label,
        subtitle: `${ev.event} · ${members.length} part${members.length === 1 ? "" : "s"}${hooks ? `, ${hooks} hook${hooks === 1 ? "" : "s"}` : ""}`,
        cls: flagsByBox.get(ev.id)?.some((f) => f.flag === "crowded-event") ? "crowded" : "",
        event: ev,
        layoutOptions: { ...LAYERED, "elk.padding": PAD },
        children,
        edges: colEdges,
      });
    }
    const laid = await Promise.all(columns.map((c) => elk.layout(c)));
    laid.forEach((c, i) => (c.width = Math.max(c.width, 150, Math.max(columns[i].title.length * 7.5, columns[i].subtitle.length * 6) + 24)));
    const { placed, width, height } = flow(laid, 36);
    const svg = svgFor(document.getElementById("canvas-lifecycle"), width, height);
    const root = el("g", { transform: "translate(8,8)" }, svg);
    const tl = el("g", { class: "timeline" }, root);
    placed.forEach((p, i) => {
      const next = placed[i + 1];
      if (next && next.y === p.y) el("path", { d: `M${p.x + p.c.width + 2},${p.y + 22}L${next.x - 4},${next.y + 22}`, "marker-end": "url(#arrow)" }, tl);
      else if (next) el("path", { d: `M${p.x + p.c.width + 2},${p.y + 22}L${p.x + p.c.width + 22},${p.y + 22}`, "marker-end": "url(#arrow)" }, tl);
    });
    for (const p of placed) drawLayout(root, { children: [p.c], edges: [] }, p.x, p.y, m);
    return svg;
  }

  // ---------- view 2: responsibilities ----------
  async function responsibilitiesView(m) {
    const cols = [...config.layers, "none", "unheld"];
    const titles = { none: "no layer yet", unheld: "listed, held by nothing" };
    const items = new Map(cols.map((c) => [c, []]));
    const nodeIdFor = new Map();
    const held = new Set();
    const parts = m.boxes.filter((b) => PART_KINDS.has(b.kind) && (b.owner === "ours" || b.layer || (b.takes ?? []).length));
    for (const b of parts) {
      const col = layerOf(b);
      const takes = b.takes ?? [];
      if (!takes.length) {
        items.get(col).push(leaf(`r|${b.id}`, b, { sub: clip(`${b.kind} · takes nothing yet`, 44) }));
        continue;
      }
      for (const t of takes) {
        held.add(t);
        const id = `r|${b.id}|${t}`;
        nodeIdFor.set(`${t}|${b.id}`, id);
        items.get(col).push(leaf(id, b, { label: t, sub: clip(`held by ${b.label}`, 44) }));
      }
    }
    for (const [id, about] of Object.entries(responsibilities)) {
      if (!held.has(id)) items.get("unheld").push(leaf(`r|job|${id}`, { id: `job:${id}`, kind: "job", label: id, owner: "ours" }, { sub: clip(about, 44) }));
    }
    // A responsibility that moved: a ghost in the old holder's column, an arrow to where it is now.
    const moved = [];
    for (const mv of m.moved) {
      for (const fromId of mv.from) {
        const old = m.base.boxes.find((b) => b.id === fromId);
        if (!old) continue;
        const ghost = `r|was|${fromId}|${mv.takes}`;
        items.get(layerOf(old)).push({ ...leaf(ghost, { ...old, ghost: true }, { label: mv.takes, sub: clip(`was held by ${old.label}`, 44) }), status: "removed" });
        for (const toId of mv.to) {
          const target = nodeIdFor.get(`${mv.takes}|${toId}`);
          if (target) moved.push({ from: ghost, to: target });
        }
      }
    }
    const children = cols
      .filter((c) => items.get(c).length || config.layers.includes(c))
      .map((c) => ({
        id: `col:${c}`,
        title: titles[c] ?? c,
        subtitle: `${items.get(c).length} item${items.get(c).length === 1 ? "" : "s"}`,
        layoutOptions: { "elk.algorithm": "box", "elk.box.packingMode": "SIMPLE", "elk.aspectRatio": items.get(c).length > 14 ? "1.2" : "0.15", "elk.padding": PAD, "elk.spacing.nodeNode": "8", ...groupMin(titles[c] ?? c, "00 items") },
        children: items.get(c).length ? [...items.get(c)].sort(byKindLabel) : [{ id: `empty:${c}`, width: 120, height: 10 }],
      }));
    const laidCols = await Promise.all(children.map((c) => elk.layout(c)));
    const f = flow(laidCols, 20);
    const svg = svgFor(document.getElementById("canvas-responsibilities"), f.width, f.height);
    const root = el("g", { transform: "translate(8,8)" }, svg);
    for (const p of f.placed) drawLayout(root, { children: [p.c], edges: [] }, p.x, p.y, m);
    const abs = new Map();
    for (const p of f.placed) for (const n of p.c.children) abs.set(n.id, { x: p.x + n.x, y: p.y + n.y, w: n.width, h: n.height });
    for (const mv of moved) {
      const a = abs.get(mv.from);
      const b = abs.get(mv.to);
      if (!a || !b) continue;
      const eg = el("g", { class: "edge moved" }, root);
      el("path", { d: `M${a.x + a.w},${a.y + a.h / 2}C${a.x + a.w + 60},${a.y + a.h / 2} ${b.x - 60},${b.y + b.h / 2} ${b.x},${b.y + b.h / 2}`, "marker-end": "url(#arrow)" }, eg);
    }
    return svg;
  }

  // ---------- view 3: dependencies and blast radius ----------
  async function dependencies(m) {
    const ids = new Set(m.boxes.map((b) => b.id));
    const edges = m.edges.filter((e) => ids.has(e.from) && ids.has(e.to));
    const linked = new Set(edges.flatMap((e) => [e.from, e.to]));
    const connected = m.boxes.filter((b) => linked.has(b.id));
    const loose = m.boxes.filter((b) => !linked.has(b.id));
    const fired = new Set(components(connected, edges).filter((list) => list.some((b) => b.kind === "event")).flat().map((b) => b.id));
    const cls = (e) => (e.removed ? "removed" : "");
    const svg = drawFlow(document.getElementById("canvas-dependencies"), await layoutComponents(connected.filter((b) => fired.has(b.id)), edges, cls), m);
    const namesBox = document.getElementById("canvas-names");
    const named = connected.filter((b) => !fired.has(b.id));
    namesBox.hidden = !named.length;
    namesBox.previousElementSibling.hidden = !named.length;
    if (named.length) drawFlow(namesBox, await layoutComponents(named, edges, cls), m);
    else namesBox.textContent = "";

    const groups = new Map();
    for (const b of loose) (groups.get(b.root ?? "other") ?? groups.set(b.root ?? "other", []).get(b.root ?? "other")).push(b);
    const looseBox = document.getElementById("canvas-loose");
    if (!groups.size) {
      looseBox.textContent = "";
      looseBox.hidden = true;
      looseBox.previousElementSibling.hidden = true;
      return svg;
    }
    looseBox.hidden = false;
    looseBox.previousElementSibling.hidden = false;
    const children = [...groups.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([root, list]) => ({
        id: `loose:${root}`,
        title: root,
        subtitle: `${list.length} part${list.length === 1 ? "" : "s"} with no edges`,
        layoutOptions: { "elk.algorithm": "box", "elk.box.packingMode": "SIMPLE", "elk.aspectRatio": "2.2", "elk.padding": PAD, "elk.spacing.nodeNode": "8", ...groupMin(root, "00 parts with no edges") },
        children: list.map((b) => leaf(`loose|${b.id}`, b)).sort(byKindLabel),
      }));
    const laid = await elk.layout({ id: "loose", layoutOptions: { "elk.algorithm": "box", "elk.aspectRatio": "1.6", "elk.spacing.nodeNode": "16", "elk.padding": "[top=8,left=8,bottom=8,right=8]" }, children });
    const svg2 = svgFor(looseBox, laid.width, laid.height);
    drawLayout(svg2, laid, 0, 0, m);
    return svg;
  }

  // ---------- view 4: compare ----------
  async function compare(m) {
    const summary = document.getElementById("compare-summary");
    const canvas = document.getElementById("canvas-compare");
    summary.textContent = "";
    canvas.textContent = "";
    const p = (text, cls) => {
      const node = document.createElement("p");
      node.textContent = text;
      if (cls) node.className = cls;
      summary.appendChild(node);
      return node;
    };
    if (!baselines.length) {
      p("No baseline differs from this graph yet. Run `env-map map --compare <git ref>`, or wait for a snapshot from another day.");
      canvas.hidden = true;
      return null;
    }
    if (!m.base) {
      p("Pick a baseline or a date above. Every view then outlines added boxes in green and removed ones in red.");
      canvas.hidden = true;
      return null;
    }
    const { added, removed, moved } = m.diff;
    p(`Compared with ${m.base.label}: ${added.length} added, ${removed.length} removed, ${moved.length} responsibilit${moved.length === 1 ? "y" : "ies"} moved.`);
    const list = document.createElement("ul");
    list.className = "changes";
    const item = (text, cls) => {
      const li = document.createElement("li");
      li.textContent = text;
      li.className = cls;
      list.appendChild(li);
    };
    const labelOf = (id) => (byId.get(id) ?? m.base.boxes.find((b) => b.id === id))?.label ?? id;
    for (const id of added) item(`+ ${labelOf(id)}  (${id.split(":")[0]})`, "added-text");
    for (const id of removed) item(`− ${labelOf(id)}  (${id.split(":")[0]})`, "removed-text");
    for (const mv of moved) item(`→ ${mv.takes}: ${mv.from.map(labelOf).join(", ")} → ${mv.to.map(labelOf).join(", ")}`, "");
    summary.appendChild(list);
    const changed = new Set([...added, ...removed, ...moved.flatMap((mv) => [...mv.from, ...mv.to])]);
    if (!changed.size) {
      canvas.hidden = true;
      return null;
    }
    canvas.hidden = false;
    const near = new Set(changed);
    for (const e of m.edges) {
      if (changed.has(e.from)) near.add(e.to);
      if (changed.has(e.to)) near.add(e.from);
    }
    const boxes = m.boxes.filter((b) => near.has(b.id));
    const ids = new Set(boxes.map((b) => b.id));
    const nearEdges = m.edges.filter((e) => ids.has(e.from) && ids.has(e.to));
    const f = await layoutComponents(boxes, nearEdges, (e) => (e.removed ? "removed" : m.status.get(e.to) === "added" ? "added" : ""));
    return drawFlow(canvas, f, m);
  }

  // ---------- selection ----------
  function select(id) {
    state.selected = id;
    const box = id ? byId.get(id) : null;
    const blast = new Set(box?.blast ?? []);
    const reach = new Set(box?.reach ?? []);
    for (const svg of document.querySelectorAll(".canvas svg")) {
      svg.classList.toggle("selecting", Boolean(id));
      for (const n of svg.querySelectorAll(".node")) {
        const nid = n.getAttribute("data-id");
        n.classList.toggle("hl-sel", nid === id);
        n.classList.toggle("hl-blast", blast.has(nid));
        n.classList.toggle("hl-reach", reach.has(nid));
      }
      for (const e of svg.querySelectorAll(".edge")) {
        const f = e.getAttribute("data-from");
        const t = e.getAttribute("data-to");
        const on = (f === id || blast.has(f) || reach.has(f)) && (t === id || blast.has(t) || reach.has(t));
        e.classList.toggle("hl", on);
      }
    }
    details(box);
  }

  function details(box) {
    const panel = document.getElementById("details");
    panel.textContent = "";
    if (!box) {
      panel.innerHTML = '<p class="detail">Click a box to see its facts. Its blast radius turns red and the events that reach it turn purple.</p>';
      return;
    }
    const h = document.createElement("p");
    h.className = "name";
    h.textContent = box.label;
    panel.appendChild(h);
    const dl = document.createElement("dl");
    dl.className = "facts";
    const fact = (k, v, missing) => {
      const dt = document.createElement("dt");
      dt.textContent = k;
      const dd = document.createElement("dd");
      dd.textContent = v;
      if (missing) dd.className = "missing";
      dl.append(dt, dd);
    };
    fact("kind", box.kind);
    if (box.owner) fact("owner", box.owner === "ours" ? "ours" : `external · ${box.root}${box.version ? ` ${box.version}` : ""}`);
    if (box.file) fact("file", box.file);
    if (box.event && box.kind !== "event") fact("event", `${box.event}${box.matcher ? ` · ${box.matcher}` : ""}`);
    if (box.command) fact("command", box.command);
    if (box.error) fact("error", box.error, true);
    if (PART_KINDS.has(box.kind)) {
      fact("why", box.why ?? "missing", !box.why);
      fact("layer", box.layer ?? "missing", !box.layer);
      fact("takes", (box.takes ?? []).join(", ") || "missing", !(box.takes ?? []).length);
    }
    if (box.kind === "row") fact("enforced by", `${box.enforcedBy || "nothing"}${box.enforced ? "" : " (no enforcer found)"}`, !box.enforced);
    if (box.git) fact("git", `${box.git.changes} changes, last ${box.git.last}, ${box.git.inWindow} in ${config.flags.churn.windowDays} days`);
    if (box.reach) fact("reached from", box.reach.map((r) => byId.get(r)?.label ?? r).join(", "));
    if (box.blast) fact("blast radius", `${box.blast.length}: ${box.blast.map((r) => byId.get(r)?.label ?? r).join(", ")}`);
    for (const f of flagsByBox.get(box.id) ?? []) fact(FLAG_INFO[f.flag]?.title ?? f.flag, readable(f.detail));
    panel.appendChild(dl);
  }

  /** A flag detail with box ids swapped for their labels. */
  function readable(text) {
    return text.replace(/\b(?:deny|rule|script|hook|skill|agent|row|githook|claude-md|memory):\S+/g, (id) => {
      const trimmed = id.replace(/[,.;]$/, "");
      return byId.get(trimmed) ? `${byId.get(trimmed).label}${id.slice(trimmed.length)}` : id;
    });
  }

  function flagPanel() {
    const panel = document.getElementById("flags");
    panel.textContent = "";
    const groups = new Map();
    for (const f of graph.flags) (groups.get(f.flag) ?? groups.set(f.flag, []).get(f.flag)).push(f);
    for (const [flag, info] of Object.entries(FLAG_INFO)) {
      const list = groups.get(flag) ?? [];
      const h = document.createElement("h3");
      h.innerHTML = `<span class="badge">${info.short}</span>`;
      h.append(`${info.title} (${list.length})`);
      panel.appendChild(h);
      const about = document.createElement("p");
      about.className = "detail";
      about.textContent = info.about;
      panel.appendChild(about);
      const ul = document.createElement("ul");
      for (const f of list) {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        const name = document.createElement("div");
        name.className = "name";
        name.textContent = byId.get(f.box)?.label ?? f.box;
        const d = document.createElement("div");
        d.className = "detail";
        d.textContent = readable(f.detail);
        btn.append(name, d);
        btn.addEventListener("click", () => select(f.box));
        li.appendChild(btn);
        ul.appendChild(li);
      }
      panel.appendChild(ul);
    }
  }

  // ---------- wiring ----------
  async function renderAll() {
    document.body.dataset.ready = "0";
    const m = model();
    await lifecycle(m);
    await responsibilitiesView(m);
    await dependencies(m);
    await compare(m);
    select(state.selected);
    document.body.dataset.ready = "1";
  }

  function show(view) {
    state.view = view;
    for (const s of document.querySelectorAll(".view")) s.classList.toggle("active", s.dataset.view === view);
    for (const b of document.querySelectorAll("nav button")) b.setAttribute("aria-selected", String(b.dataset.target === view));
    try {
      localStorage.setItem("env-map-view", view);
    } catch {
      // Remembering the tab is a convenience only.
    }
  }

  const pick = document.getElementById("baseline");
  for (const b of baselines) {
    const o = document.createElement("option");
    o.value = b.id;
    o.textContent = b.label;
    pick.appendChild(o);
  }
  pick.addEventListener("change", () => {
    state.baseline = pick.value;
    renderAll();
  });
  document.getElementById("compare-date").addEventListener("change", (ev) => {
    const date = ev.target.value;
    const match = baselines.filter((b) => b.date <= date).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    pick.value = match ? match.id : "";
    state.baseline = pick.value;
    renderAll();
  });
  for (const b of document.querySelectorAll("nav button")) b.addEventListener("click", () => show(b.dataset.target));
  document.getElementById("fit").addEventListener("click", (ev) => {
    const on = !document.querySelector(".canvas").classList.contains("fit");
    for (const c of document.querySelectorAll(".canvas")) c.classList.toggle("fit", on);
    ev.target.textContent = on ? "Actual size" : "Fit to width";
  });

  const params = new URLSearchParams(location.hash.slice(1));
  let initial = params.get("view");
  try {
    initial ??= localStorage.getItem("env-map-view");
  } catch {
    // No stored tab.
  }
  if (params.get("compare")) {
    const want = params.get("compare");
    const match = baselines.find((b) => b.id === want || b.label.startsWith(want));
    if (match) {
      state.baseline = match.id;
      pick.value = match.id;
    }
  }
  show(["lifecycle", "responsibilities", "dependencies", "compare"].includes(initial) ? initial : "lifecycle");
  flagPanel();
  renderAll().then(() => {
    if (params.get("select")) select(params.get("select"));
  });
})();
