<script>
  /**
   * Q&A Panel — displays categorized questions with expandable answers.
   * Categories: execution (gray), error (red), lifecycle/state (blue), permissions/auth (purple).
   */
  import { md } from '../shared/md.js';
  const { items = [], ontraceselect } = $props();

  // Track open/closed state per item index — all default open
  // svelte-ignore state_referenced_locally
  let openStates = $state(items.map(() => true));

  function toggleItem(index) {
    openStates[index] = !openStates[index];
  }

  function categoryClass(cat) {
    if (cat === 'error') return 'qc-error';
    if (cat === 'lifecycle' || cat === 'state') return 'qc-state';
    if (cat === 'permissions' || cat === 'auth') return 'qc-auth';
    return 'qc-default';
  }

  function markerClass(cat) {
    if (cat === 'error') return 'qm-error';
    if (cat === 'lifecycle' || cat === 'state') return 'qm-state';
    if (cat === 'permissions' || cat === 'auth') return 'qm-auth';
    return 'qm-default';
  }

  function markerLetter(cat) {
    if (cat === 'error') return '!';
    if (cat === 'lifecycle' || cat === 'state') return 'S';
    if (cat === 'permissions' || cat === 'auth') return 'A';
    return 'Q';
  }

  function categoryLabel(cat) {
    if (cat === 'error') return 'Error Handling';
    if (cat === 'lifecycle' || cat === 'state') return 'Lifecycle / State';
    if (cat === 'permissions' || cat === 'auth') return 'Permissions / Auth';
    return 'Execution';
  }

  // Group items by category preserving order of first appearance
  const grouped = $derived.by(() => {
    const groups = [];
    const seen = new Set();
    items.forEach((item, idx) => {
      const cat = item.category || 'execution';
      if (!seen.has(cat)) {
        seen.add(cat);
        groups.push({ category: cat, items: [] });
      }
      groups.find(g => g.category === cat).items.push({ ...item, _idx: idx });
    });
    return groups;
  });
</script>

<div class="col-qa">
  <div class="col-header">Q & A</div>
  {#each grouped as group}
    <div class="qa-category {categoryClass(group.category)}">{categoryLabel(group.category)}</div>
    {#each group.items as item}
      <div class="qa-item" class:open={openStates[item._idx]}>
        <div
          class="qa-q"
          role="button"
          tabindex="0"
          onclick={() => toggleItem(item._idx)}
          onkeydown={(e) => e.key === 'Enter' && toggleItem(item._idx)}
        >
          <span class="q-marker {markerClass(group.category)}">{markerLetter(group.category)}</span>
          {item.question}
        </div>
        <div class="qa-a">
          {@html md(item.answer)}
          {#if item.traceLink}
            <div
              class="qa-link-trace"
              role="button"
              tabindex="0"
              onclick={(e) => { e.stopPropagation(); ontraceselect?.(item.traceLink); }}
              onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); ontraceselect?.(item.traceLink); } }}
            >Show in trace &rarr;</div>
          {/if}
        </div>
      </div>
    {/each}
  {/each}
</div>

<style>
  .col-qa {
    background: white;
    overflow-y: auto;
    flex-shrink: 0;
    border-right: 1px solid var(--gray-200);
  }
  .col-header {
    position: sticky;
    top: 0;
    z-index: 10;
    padding: 8px 14px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .5px;
    border-bottom: 1px solid var(--gray-200);
    background: var(--gray-50);
    color: var(--gray-500);
  }
  .qa-category {
    padding: 6px 12px 2px;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .5px;
    border-bottom: 1px solid var(--gray-100);
    margin-top: 2px;
  }
  .qc-default { color: var(--gray-400); }
  .qc-state { color: var(--blue); }
  .qc-error { color: var(--red); }
  .qc-auth { color: var(--purple); }

  .qa-item {
    border-bottom: 1px solid var(--gray-100);
    cursor: pointer;
  }
  .qa-item:hover { background: var(--gray-50); }

  .qa-q {
    padding: 7px 12px;
    font-size: 12px;
    font-weight: 600;
    color: var(--gray-800);
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .q-marker {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    flex-shrink: 0;
    font-size: 8px;
    font-weight: 700;
    margin-top: 1px;
  }
  .qm-default { background: var(--gray-800); color: white; }
  .qm-error { background: var(--red); color: white; }
  .qm-auth { background: var(--purple); color: white; }
  .qm-state { background: var(--blue); color: white; }

  .qa-a {
    display: none;
    padding: 0 12px 8px 36px;
    font-size: 11px;
    color: var(--gray-600);
    line-height: 1.6;
  }
  .qa-item.open .qa-a { display: block; }

  .qa-a :global(pre) {
    background: var(--gray-900);
    color: var(--gray-300);
    font-family: var(--font-mono);
    font-size: 10px;
    line-height: 1.6;
    padding: 8px 10px;
    border-radius: 5px;
    margin: 6px 0;
    overflow-x: auto;
    white-space: pre;
  }
  .qa-a :global(pre code) {
    background: none;
    padding: 0;
    border-radius: 0;
    font-size: inherit;
    color: inherit;
  }
  .qa-a :global(code) {
    font-family: var(--font-mono);
    background: var(--gray-100);
    padding: 0 4px;
    border-radius: 2px;
    font-size: 10px;
  }
  .qa-a :global(strong) { color: var(--gray-800); }

  .qa-link-trace {
    display: inline-block;
    font-size: 10px;
    color: var(--brand);
    font-weight: 600;
    cursor: pointer;
    margin-top: 3px;
    border-bottom: 1px dashed var(--brand);
  }
  .qa-link-trace:hover { color: #004a5a; }
</style>
