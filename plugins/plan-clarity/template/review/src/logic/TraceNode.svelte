<script>
  /**
   * TraceNode — recursive trace node with status pip, label, annotation, and optional edge branches.
   * Uses self-import for recursive edge rendering.
   */
  import TraceNode from './TraceNode.svelte';

  const { node, group = 'default', activeTraceId = '', onselect } = $props();

  const selected = $derived(activeTraceId === node.id);
  const statusClass = $derived(node.status || 'unchanged');

  const badgeText = $derived({
    unchanged: 'same',
    new: 'new',
    changed: 'edit',
    deleted: 'del',
  }[node.status] || 'same');

  // Determine if this is an edge node based on group type
  const isEdge = $derived(group === 'error' || group === 'edge');
  const isState = $derived(group === 'state' || group === 'lifecycle');
  const isAuth = $derived(group === 'auth');

  const dotClass = $derived(
    isEdge ? 'dot dot-edge' :
    isState ? 'dot dot-state' :
    isAuth ? 'dot dot-auth' :
    'dot'
  );

  const labelClass = $derived(
    isEdge ? 'trace-label label-edge' :
    isState ? 'trace-label label-state' :
    isAuth ? 'trace-label label-auth' :
    'trace-label'
  );

  const badgeClass = $derived(
    isEdge ? 'trace-badge badge-edge' :
    isState ? 'trace-badge badge-state' :
    isAuth ? 'trace-badge badge-auth' :
    'trace-badge'
  );

  function handleClick() {
    onselect?.(node.id);
  }
</script>

<div
  class="trace-node {statusClass}"
  class:edge={isEdge}
  class:selected
  role="button"
  tabindex="0"
  data-trace={node.id}
  onclick={handleClick}
  onkeydown={(e) => e.key === 'Enter' && handleClick()}
>
  <div class="trace-pip">
    <div class={dotClass}></div>
    <span class={badgeClass}>{isEdge ? 'edge' : badgeText}</span>
  </div>
  <div class="trace-content">
    <div class={labelClass}>{node.label}</div>
    {#if node.annotation}
      <div class="trace-brief">{node.annotation}</div>
    {/if}
  </div>
</div>

{#if node.edges?.length}
  <div class="trace-branch branch-error">
    {#each node.edges as edge}
      <TraceNode node={edge} group="error" {activeTraceId} {onselect} />
    {/each}
  </div>
{/if}

<style>
  .trace-node {
    display: flex;
    gap: 6px;
    align-items: flex-start;
    cursor: pointer;
    border-radius: 6px;
    padding: 4px;
    margin: 0 -4px;
    transition: background .1s;
  }
  .trace-node:hover { background: rgba(0,0,0,.03); }

  .trace-pip {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    width: 28px;
    padding-top: 2px;
  }
  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    border: 2px solid var(--gray-300);
    background: white;
    flex-shrink: 0;
    transition: all .15s;
  }
  .trace-badge {
    font-size: 7px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .3px;
    margin-top: 2px;
    text-align: center;
  }
  .trace-content {
    flex: 1;
    padding: 1px 4px 4px;
  }
  .trace-label {
    font-weight: 600;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .3px;
    line-height: 1.3;
  }
  .trace-brief {
    font-size: 9px;
    color: var(--gray-400);
    line-height: 1.3;
    margin-top: 1px;
  }

  /* Status-based dot colors */
  .trace-node.unchanged .dot { border-color: var(--gray-300); }
  .trace-node.new .dot { border-color: var(--green); }
  .trace-node.changed .dot { border-color: var(--amber); }
  .trace-node.deleted .dot { border-color: var(--red); }

  /* Status-based label colors */
  .trace-node.unchanged .trace-label { color: var(--gray-400); }
  .trace-node.new .trace-label { color: var(--green); }
  .trace-node.changed .trace-label { color: var(--amber); }
  .trace-node.deleted .trace-label { color: var(--red); }

  /* Status-based badge colors */
  .trace-node.unchanged .trace-badge { color: var(--gray-400); }
  .trace-node.new .trace-badge { color: var(--green); }
  .trace-node.changed .trace-badge { color: var(--amber); }
  .trace-node.deleted .trace-badge { color: var(--red); }

  /* Selected states */
  .trace-node.unchanged.selected { background: var(--gray-100); }
  .trace-node.new.selected { background: var(--green-bg); }
  .trace-node.changed.selected { background: var(--amber-bg); }
  .trace-node.deleted.selected { background: var(--red-bg); }
  .trace-node.selected .dot { box-shadow: 0 0 0 3px rgba(0,0,0,.08); }
  .trace-node.unchanged.selected .dot { border-color: var(--gray-500); background: var(--gray-500); }
  .trace-node.new.selected .dot { border-color: var(--green); background: var(--green); }
  .trace-node.changed.selected .dot { border-color: var(--amber); background: var(--amber); }
  .trace-node.deleted.selected .dot { border-color: var(--red); background: var(--red); }

  /* Edge/state/auth dot overrides */
  .dot.dot-edge { border-color: var(--red); }
  .dot.dot-state { border-color: var(--blue); }
  .dot.dot-auth { border-color: var(--purple); }

  :global(.trace-content) .label-edge { color: var(--red); }
  :global(.trace-content) .label-state { color: var(--blue); }
  :global(.trace-content) .label-auth { color: var(--purple); }

  .badge-edge { color: var(--red); }
  .badge-state { color: var(--blue); }
  .badge-auth { color: var(--purple); }

  /* Edge node opacity */
  .trace-node.edge { opacity: .7; }
  .trace-node.edge.selected {
    opacity: 1;
    background: var(--red-bg);
  }
  .trace-node.edge.selected .dot.dot-edge {
    border-color: var(--red);
    background: var(--red);
    box-shadow: 0 0 0 3px rgba(0,0,0,.08);
  }

  /* Branch indentation */
  .trace-branch {
    margin-left: 14px;
    padding-left: 10px;
    border-left: 2px dashed var(--gray-300);
  }
  .trace-branch.branch-error { border-left-color: var(--red); }
  .trace-branch.branch-state { border-left-color: var(--blue); }
</style>
