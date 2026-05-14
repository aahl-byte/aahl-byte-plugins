<script>
  const { stores, side, activeTab, tabHighlights, arrowFields } = $props();

  // Determine primary store for current tab
  const primaryStoreId = $derived(tabHighlights[activeTab]?.stores ?? '');
  const relevantFields = $derived(new Set(tabHighlights[activeTab]?.fields ?? []));

  const fieldAttr = $derived(side === 'current' ? 'data-cur-field' : 'data-new-field');

  function fieldClasses(field) {
    const classes = ['su-row'];
    if (field.status === 'new') classes.push('su-new');
    if (field.status === 'removed') classes.push('su-drop');

    const isRelevant = relevantFields.has(field.id);
    const hasArrow = arrowFields.has(field.id);

    if (isRelevant && hasArrow) {
      classes.push('tab-highlight');
    } else if (!isRelevant) {
      classes.push('tab-dim');
    }
    // isRelevant but no arrow on this side => normal status bg (default classes handle it)

    return classes.join(' ');
  }

  function storeClasses(store) {
    const classes = ['store-block'];
    if (store.id === primaryStoreId) {
      classes.push('primary');
    } else {
      classes.push('secondary');
    }
    return classes.join(' ');
  }
</script>

<div class="col col-store">
  {#if side === 'current'}
    <div class="col-header label-sm ch-muted"><span class="dot"></span> Current Store</div>
  {:else}
    <div class="col-header label-sm ch-accent"><span class="dot"></span> New Store</div>
  {/if}

  {#each stores as store}
    <div class={storeClasses(store)} style="--store-color: {store.color}">
      <div class="store-block-header label-sm">
        <span class="dot" style="background: {store.color}"></span>
        {store.label}
      </div>
      {#each store.sections as section}
        <div class="sf-divider label-sm">{section.heading}</div>
        {#each section.fields as field}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class={fieldClasses(field)} {...{[fieldAttr]: field.id}}>
            <span class="su-name">{field.name}</span>
            <span class="su-type">{field.type}</span>
          </div>
        {/each}
      {/each}
    </div>
  {/each}
</div>

<style>
  .col-store {
    display: flex;
    flex-direction: column;
    width: 220px;
    flex-shrink: 0;
    overflow-y: auto;
  }

  .col-header {
    position: sticky;
    top: 0;
    z-index: 10;
    padding: 8px 10px;
    font-size: 9px;
    display: flex;
    align-items: center;
    gap: 6px;
    border-bottom: 1px solid var(--gray-200);
    order: 0;
  }
  .ch-muted {
    background: var(--gray-100);
    color: var(--gray-500);
  }
  .ch-muted .dot {
    background: var(--gray-400);
  }
  .ch-accent {
    background: var(--gray-800);
    color: white;
  }
  .ch-accent .dot {
    background: var(--green);
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .label-sm {
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .4px;
  }

  .store-block {
    border-bottom: 1px solid var(--gray-200);
    transition: opacity .2s;
  }
  .store-block.secondary {
    opacity: .35;
    order: 2;
  }
  .store-block.primary {
    opacity: 1;
    order: 1;
  }

  .store-block-header {
    padding: 5px 10px;
    font-size: 9px;
    display: flex;
    align-items: center;
    gap: 5px;
    background: var(--gray-50);
    border-bottom: 1px solid var(--gray-100);
    color: var(--store-color);
  }

  .sf-divider {
    padding: 3px 10px;
    font-size: 7px;
    color: var(--gray-400);
    background: var(--gray-50);
    border-bottom: 1px solid var(--gray-100);
    border-top: 1px solid var(--gray-100);
  }

  .su-row {
    display: flex;
    padding: 2px 10px;
    border-bottom: 1px solid var(--gray-50);
    font-size: 10px;
    gap: 4px;
    align-items: baseline;
    transition: background .15s;
    white-space: nowrap;
  }
  .su-name {
    font-family: var(--font-mono);
    font-weight: 500;
    color: var(--gray-700);
    flex-shrink: 0;
  }
  .su-type {
    font-size: 9px;
    color: var(--gray-400);
    margin-left: auto;
  }

  .su-row.su-new {
    background: var(--green-bg);
  }
  .su-row.su-new .su-name {
    color: var(--green);
    font-weight: 600;
  }
  .su-row.su-drop {
    background: var(--red-bg);
  }
  .su-row.su-drop .su-name {
    text-decoration: line-through;
    color: var(--red);
  }
  .su-row.su-drop .su-type {
    color: var(--red);
  }

  /* 3-tier highlight system */
  .su-row.tab-highlight .su-name {
    color: white !important;
    text-decoration: none !important;
  }
  .su-row.tab-highlight .su-type {
    color: rgba(255, 255, 255, .7) !important;
  }
  .su-row.tab-highlight {
    background: var(--gray-500) !important;
  }
  .su-row.su-new.tab-highlight {
    background: #4a8a6a !important;
  }
  .su-row.su-drop.tab-highlight {
    background: #a8706a !important;
  }
  .su-row.tab-dim {
    opacity: .35;
  }
</style>
