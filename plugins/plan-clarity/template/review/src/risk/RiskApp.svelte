<script>
  import TopBar from '../shared/TopBar.svelte';
  import TOC from '../shared/TOC.svelte';
  import DetailPanel from '../shared/DetailPanel.svelte';
  import Callout from '../shared/Callout.svelte';
  import FindingCard from './FindingCard.svelte';
  import SwimLane from './SwimLane.svelte';
  import NoteFooter from './NoteFooter.svelte';
  import ExportModal from './ExportModal.svelte';
  import { generateYAML } from './YAMLExport.js';
  import { md } from '../shared/md.js';

  const { config } = $props();

  // ── State ──────────────────────────────────────────────────────────────
  let noteStore     = $state({});
  let statusStore   = $state({});
  let decisionStore = $state({});
  let selectedId    = $state(null);
  let activeFilter  = $state('all');
  let showExportModal = $state(false);
  let exportContent   = $state('');

  // ── Persistence ────────────────────────────────────────────────────────
  const STORAGE_KEY = 'risk-review-' + (typeof location !== 'undefined' ? location.pathname : '');
  let debounceTimer = null;

  function persist() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          notes:     noteStore,
          statuses:  statusStore,
          decisions: decisionStore,
        }));
      } catch {}
    }, 300);
  }

  $effect(() => {
    // Restore from localStorage on mount
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        noteStore     = data.notes     ?? {};
        statusStore   = data.statuses  ?? {};
        decisionStore = data.decisions ?? {};
      }
    } catch {}
  });

  // Watch for changes and persist
  $effect(() => {
    // Access all stores to register reactivity
    const _n = JSON.stringify(noteStore);
    const _s = JSON.stringify(statusStore);
    const _d = JSON.stringify(decisionStore);
    persist();
  });

  // ── Derived Data ───────────────────────────────────────────────────────
  const findings = $derived(config.findings ?? []);

  const categoriesWithFindings = $derived.by(() => {
    const cats = new Set();
    for (const f of findings) cats.add(f.category);
    return [...cats];
  });

  const hasCriticalByCategory = $derived.by(() => {
    const map = {};
    for (const f of findings) {
      if (f.severity === 'critical') map[f.category] = true;
    }
    return map;
  });

  const criticalCount = $derived(findings.filter(f => f.severity === 'critical').length);
  const total         = $derived(findings.length);

  const reviewed = $derived(
    findings.filter(f =>
      statusStore[f.id] || noteStore[f.id] || decisionStore[f.id]
    ).length
  );

  const pct = $derived(total > 0 ? Math.round((reviewed / total) * 100) : 0);

  // ── TOC ────────────────────────────────────────────────────────────────
  const tocSections = $derived([
    {
      heading: 'Categories',
      items: [
        { id: 'all', label: 'All', badge: { label: String(total), variant: 'count' } },
        ...categoriesWithFindings.map(cat => ({
          id:    cat,
          label: cat,
          badge: {
            label:   String(findings.filter(f => f.category === cat).length),
            variant: hasCriticalByCategory[cat] ? 'crit' : 'count',
          },
        })),
      ],
    },
  ]);

  // ── Filtered findings per lane ─────────────────────────────────────────
  function filterFindingsForSeverity(sev) {
    return findings.filter(f =>
      f.severity === sev &&
      (activeFilter === 'all' || f.category === activeFilter)
    );
  }

  const criticalFindings = $derived(filterFindingsForSeverity('critical'));
  const warningFindings  = $derived(filterFindingsForSeverity('warning'));
  const infoFindings     = $derived(filterFindingsForSeverity('info'));
  const openFindings     = $derived(filterFindingsForSeverity('open'));

  // ── Selected finding ───────────────────────────────────────────────────
  const selectedFinding = $derived(
    selectedId ? findings.find(f => f.id === selectedId) : null
  );

  // ── Status class for cards ─────────────────────────────────────────────
  function getStatusClass(id) {
    const s = statusStore[id];
    if (s === 'ignore')     return 'status-ignore';
    if (s === 'acceptfix')  return 'status-acceptfix';
    if (s === 'discuss')    return 'status-discuss';
    if (noteStore[id] || decisionStore[id]) return 'has-note';
    return '';
  }

  // ── Decision options for selected finding ──────────────────────────────
  const selectedDecisionOptions = $derived(
    selectedFinding?.detail?.options?.map(o => ({
      id:          o.id,
      label:       o.label,
      recommended: o.recommended ?? false,
    })) ?? []
  );

  // Build a map of decisionOptions per finding id for export
  function buildDecisionOptionsMap() {
    const map = {};
    for (const f of findings) {
      if (f.detail?.options) {
        map[f.id] = f.detail.options.map(o => ({ id: o.id, label: o.label, recommended: o.recommended }));
      }
    }
    return map;
  }

  // ── getMitigation ──────────────────────────────────────────────────────
  function getMitigation(id) {
    const f = findings.find(ff => ff.id === id);
    if (!f) return '';
    const m = f.detail?.mitigation;
    if (!m) return '';
    return m.label ? `${m.label}: ${m.body}` : String(m.body ?? '');
  }

  // ── Actions ────────────────────────────────────────────────────────────
  function clearAll() {
    if (!confirm('Clear all notes, statuses, and decisions?')) return;
    noteStore     = {};
    statusStore   = {};
    decisionStore = {};
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }

  function showExport() {
    exportContent = generateYAML(
      findings,
      statusStore,
      noteStore,
      decisionStore,
      buildDecisionOptionsMap(),
      getMitigation
    );
    showExportModal = true;
  }
</script>

<div class="app">
  <TopBar
    title={config.title}
    tags={[
      { label: `${total} findings · ${criticalCount} critical`, variant: 'del' },
    ]}
  >
    <span class="progress-pill">
      <span>{reviewed} / {total} reviewed</span>
      <div class="progress-bar"><div class="progress-fill" style="width:{pct}%"></div></div>
    </span>
    <button class="top-bar-btn" onclick={clearAll}>Clear</button>
    <button class="top-bar-btn primary" onclick={showExport}>Export</button>
  </TopBar>

  <div class="body">
    <TOC
      sections={tocSections}
      activeId={activeFilter}
      onselect={(id) => { activeFilter = id; }}
    />

    <div class="swim-lanes">
      <SwimLane severity="critical" label="Critical" count={criticalFindings.length}>
        {#each criticalFindings as f}
          <FindingCard
            finding={f}
            selected={selectedId === f.id}
            statusClass={getStatusClass(f.id)}
            onclick={() => { selectedId = f.id; }}
          />
        {/each}
      </SwimLane>

      <SwimLane severity="warning" label="Warning" count={warningFindings.length}>
        {#each warningFindings as f}
          <FindingCard
            finding={f}
            selected={selectedId === f.id}
            statusClass={getStatusClass(f.id)}
            onclick={() => { selectedId = f.id; }}
          />
        {/each}
      </SwimLane>

      <SwimLane severity="info" label="Info" count={infoFindings.length}>
        {#each infoFindings as f}
          <FindingCard
            finding={f}
            selected={selectedId === f.id}
            statusClass={getStatusClass(f.id)}
            onclick={() => { selectedId = f.id; }}
          />
        {/each}
      </SwimLane>

      <SwimLane severity="open" label="Open Decisions" count={openFindings.length}>
        {#each openFindings as f}
          <FindingCard
            finding={f}
            selected={selectedId === f.id}
            statusClass={getStatusClass(f.id)}
            onclick={() => { selectedId = f.id; }}
          />
        {/each}
      </SwimLane>
    </div>

    <DetailPanel
      activeId={selectedId}
      width="400px"
      emptyMessage="Select a finding to view details"
    >
      {#snippet footer()}
        {#if selectedFinding}
          <NoteFooter
            findingId={selectedFinding.id}
            decisionOptions={selectedDecisionOptions}
            status={statusStore[selectedFinding.id] ?? ''}
            decision={decisionStore[selectedFinding.id] ?? ''}
            note={noteStore[selectedFinding.id] ?? ''}
            onstatuschange={(s) => { statusStore = { ...statusStore, [selectedFinding.id]: s }; }}
            ondecisionchange={(d) => { decisionStore = { ...decisionStore, [selectedFinding.id]: d }; }}
            onnotechange={(n) => { noteStore = { ...noteStore, [selectedFinding.id]: n }; }}
          />
        {/if}
      {/snippet}

      {#if selectedFinding}
        <div class="detail-title">{selectedFinding.name}</div>
        <div class="detail-meta">
          <span class="sev sev-{selectedFinding.severity}">{selectedFinding.severity}</span>
          <span class="detail-cat-label">{selectedFinding.category}</span>
        </div>

        {#if selectedFinding.detail?.summary}
          <div class="detail-summary">{@html md(selectedFinding.detail.summary)}</div>
        {/if}

        {#if selectedFinding.detail?.context}
          <div class="detail-section">
            <div class="detail-section-title dst-context">Context</div>
            <div class="detail-text">{@html md(selectedFinding.detail.context)}</div>
          </div>
        {/if}

        {#if selectedFinding.severity !== 'open'}
          {#if selectedFinding.detail?.impact}
            <div class="detail-section">
              <div class="detail-section-title dst-impact">Impact</div>
              <Callout variant="impact" label={selectedFinding.detail.impact.label}>
                <div class="detail-text">{@html md(selectedFinding.detail.impact.body)}</div>
              </Callout>
            </div>
          {/if}

          {#if selectedFinding.detail?.mitigation}
            <div class="detail-section">
              <div class="detail-section-title dst-mitigation">Mitigation</div>
              <Callout variant="mitigation" label={selectedFinding.detail.mitigation.label}>
                <div class="detail-text">{@html md(selectedFinding.detail.mitigation.body)}</div>
              </Callout>
            </div>
          {/if}
        {:else}
          {#if selectedFinding.detail?.options?.length}
            <div class="detail-section">
              <div class="detail-section-title dst-options">Options</div>
              {#each selectedFinding.detail.options as opt, i}
                {@const variant = i === 0 ? 'option-a' : i === 1 ? 'option-b' : 'option-c'}
                <Callout {variant} label="{opt.id}: {opt.label}">
                  {#if opt.recommended}
                    <div class="detail-text" style="color: var(--green); font-weight: 600;">Recommended</div>
                  {/if}
                </Callout>
              {/each}
            </div>
          {/if}
        {/if}

        {#if selectedFinding.location}
          <div class="detail-section">
            <div class="detail-section-title dst-code">Location</div>
            <span class="code-ref">{selectedFinding.location}</span>
          </div>
        {/if}
      {/if}
    </DetailPanel>
  </div>
</div>

<ExportModal
  visible={showExportModal}
  content={exportContent}
  onclose={() => { showExportModal = false; }}
/>

<style>
  .app {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  .swim-lanes {
    flex: 1;
    display: flex;
    gap: 1px;
    background: var(--gray-200);
    overflow-x: auto;
    overflow-y: hidden;
  }

  /* TopBar extras */
  .progress-pill {
    font-size: 10px;
    color: var(--gray-400);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .progress-bar {
    width: 60px;
    height: 4px;
    background: var(--gray-700);
    border-radius: 2px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: var(--green);
    border-radius: 2px;
    transition: width .3s;
  }
  .top-bar-btn {
    font-size: 11px;
    font-weight: 600;
    padding: 5px 12px;
    border-radius: 4px;
    border: 1px solid rgba(255,255,255,.3);
    background: transparent;
    color: white;
    cursor: pointer;
  }
  .top-bar-btn:hover {
    background: rgba(255,255,255,.1);
  }
  .top-bar-btn.primary {
    background: var(--green);
    border-color: var(--green);
  }
  .top-bar-btn.primary:hover {
    background: #12703a;
  }

  /* Severity badges */
  .sev {
    font-size: 9px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 3px;
    text-transform: uppercase;
    letter-spacing: .3px;
  }
  .sev-critical { background: var(--red-bg); color: var(--red); }
  .sev-warning  { background: var(--amber-bg); color: var(--amber); }
  .sev-info     { background: var(--blue-bg); color: var(--blue); }
  .sev-open     { background: var(--purple-bg); color: var(--purple); }

  /* Detail meta row */
  .detail-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    margin-top: 4px;
  }
  .detail-cat-label {
    font-size: 10px;
    color: var(--gray-400);
    text-transform: uppercase;
    letter-spacing: .3px;
  }
</style>
