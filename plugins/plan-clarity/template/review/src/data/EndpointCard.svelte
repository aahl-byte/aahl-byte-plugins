<script>
  const { endpoint, dynamicComponent: DynComp, activeTraceId = '' } = $props();

  const headerClass = {
    new: 'eh-new',
    mod: 'eh-mod',
    del: 'eh-del',
  };

  const badgeClass = {
    new: 'b-new',
    mod: 'b-mod',
    del: 'b-del',
  };

  const badgeLabel = {
    new: 'new',
    mod: 'modified',
    del: 'removed',
  };

  function fieldClass(status) {
    if (status === 'new') return 'sf-new';
    if (status === 'drop') return 'sf-drop';
    return '';
  }

  const isRemoved = $derived(endpoint.status === 'del');
</script>

<div class="panel ep-card" class:ep-removed={isRemoved} id={endpoint.id}>
  <!-- Header -->
  <div class="ep-card-header {headerClass[endpoint.status] ?? ''}">
    <span class="ep-method">{endpoint.method}</span>
    {endpoint.path}
    <span class="ep-badge {badgeClass[endpoint.status] ?? ''}">{badgeLabel[endpoint.status] ?? endpoint.status}</span>
  </div>

  <!-- 3-column body -->
  <div class="ep-card-body">
    <!-- Col 1: Input -->
    <div class="ep-half">
      <div class="ep-half-header">Input</div>
      {#each endpoint.input ?? [] as field}
        <div class="sf-row {fieldClass(field.status)}">
          <span class="sf-name">{field.name}</span>
          <span class="sf-type">{field.type ?? ''}</span>
          {#if field.note}
            <span class="sf-note">{field.note}</span>
          {/if}
        </div>
      {/each}
      {#if !endpoint.input?.length}
        <div class="empty-state">No input params</div>
      {/if}
    </div>

    <!-- Col 2: Output -->
    <div class="ep-half">
      <div class="ep-half-header">Output</div>
      {#each endpoint.output ?? [] as field}
        <div class="sf-row {fieldClass(field.status)}">
          <span class="sf-name">{field.name}</span>
          <span class="sf-type">{field.type ?? ''}</span>
          {#if field.note}
            <span class="sf-note">{field.note}</span>
          {/if}
        </div>
      {/each}
      {#if !endpoint.output?.length}
        <div class="empty-state">No output fields</div>
      {/if}
    </div>

    <!-- Col 3: Code Diff (dynamic) -->
    <div class="ep-half ep-card-code">
      <div class="ep-half-header ep-code-header">Code Diff</div>
      {#if DynComp}
        <div class="cb-body">
          <DynComp {activeTraceId} />
        </div>
      {:else}
        <div class="no-code">No code file specified</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .panel {
    border: 1px solid var(--gray-200);
    border-radius: 8px;
    overflow: hidden;
    background: white;
    margin-bottom: 16px;
  }

  .ep-card.ep-removed {
    opacity: .6;
  }
  .ep-card.ep-removed .ep-card-header {
    border-left: 3px solid var(--red);
  }

  .ep-card-header {
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid var(--gray-200);
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 700;
    color: var(--gray-700);
    background: var(--gray-50);
  }
  .ep-card-header.eh-new { background: var(--green-bg); color: var(--green); }
  .ep-card-header.eh-mod { background: var(--amber-bg); color: var(--amber); }
  .ep-card-header.eh-del { background: var(--red-bg); color: var(--red); }

  .ep-method {
    font-size: 12px;
    font-weight: 700;
    color: inherit;
  }

  .ep-badge {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 4px;
    letter-spacing: .5px;
    margin-left: auto;
  }
  .ep-badge.b-new { background: var(--green); color: white; }
  .ep-badge.b-mod { background: var(--amber); color: white; }
  .ep-badge.b-del { background: var(--red); color: white; }

  .ep-card-body {
    display: grid;
    grid-template-columns: 1fr 1fr 1.3fr;
    gap: 0;
  }

  .ep-half {
    padding: 0;
    border-right: 1px solid var(--gray-200);
  }
  .ep-half:last-child { border-right: none; }

  .ep-half-header {
    padding: 6px 14px;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .5px;
    color: var(--gray-400);
    background: var(--gray-50);
    border-bottom: 1px solid var(--gray-100);
  }
  .ep-code-header {
    background: var(--gray-800);
    color: var(--gray-500);
    border-bottom-color: #374151;
  }

  .sf-row {
    display: flex;
    align-items: baseline;
    padding: 3px 14px;
    border-bottom: 1px solid var(--gray-50);
    font-size: 11px;
    gap: 6px;
  }
  .sf-row:last-child { border-bottom: none; }
  .sf-row:hover { background: var(--gray-50); }

  .sf-name {
    font-family: var(--font-mono);
    font-weight: 500;
    color: var(--gray-700);
    min-width: 120px;
    flex-shrink: 0;
  }
  .sf-type {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--gray-400);
    flex-shrink: 0;
  }
  .sf-note {
    font-size: 10px;
    color: var(--gray-400);
    font-style: italic;
    flex: 1;
  }

  .sf-row.sf-new { background: var(--green-bg); }
  .sf-row.sf-new .sf-name { color: var(--green); font-weight: 600; }
  .sf-row.sf-drop { background: var(--red-bg); }
  .sf-row.sf-drop .sf-name { text-decoration: line-through; color: var(--red); }

  .ep-card-code {
    background: var(--gray-900);
    display: flex;
    flex-direction: column;
  }

  .cb-body {
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 1.7;
    padding: 8px 0;
    flex: 1;
    overflow-y: auto;
  }

  .empty-state, .no-code {
    padding: 12px 14px;
    color: var(--gray-400);
    font-size: 11px;
    font-style: italic;
  }
  .no-code {
    color: var(--gray-500);
  }
</style>
