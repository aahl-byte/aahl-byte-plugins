<script>
  import TopBar from '../shared/TopBar.svelte';
  import Tabs from '../shared/Tabs.svelte';
  import StoreColumn from './StoreColumn.svelte';
  import ArrowOverlay from './ArrowOverlay.svelte';
  import MockupFrame from './MockupFrame.svelte';

  const { config } = $props();

  // Dynamic mockup imports (recursive to support per-facet subdirectories)
  const dynamicModules = import.meta.glob('/dynamic/**/*.svelte', { eager: true });

  function getDynamicComponent(fileId) {
    if (!fileId) return null;
    const match = Object.entries(dynamicModules).find(([path]) =>
      path.endsWith(`/${fileId}.svelte`)
    );
    return match?.[1]?.default ?? null;
  }

  // State
  // svelte-ignore state_referenced_locally
  let activeTab = $state(config.tabs?.[0]?.id ?? '');
  let containerRef = $state(null);

  // Build tab list for shared Tabs component (with color from primary store)
  const tabList = $derived(
    (config.tabs ?? []).map(tab => {
      const primaryStore = (config.stores ?? []).find(s => s.id === tab.primaryStore);
      return {
        id: tab.id,
        label: tab.label,
        color: primaryStore?.color ?? 'var(--gray-500)',
      };
    })
  );

  // Build tabHighlights: for each tab, which store is primary, which fields are relevant
  const tabHighlights = $derived.by(() => {
    const result = {};
    for (const tab of config.tabs ?? []) {
      const fields = (config.arrows ?? [])
        .filter(a => a.tab === tab.id)
        .flatMap(a => [a.from, a.to]);
      result[tab.id] = {
        stores: tab.primaryStore,
        fields: [...new Set(fields)],
      };
    }
    return result;
  });

  // Build per-side arrow field sets for the active tab
  const curArrowFields = $derived.by(() => {
    const set = new Set();
    const attrNames = ['data-cur-field', 'data-new-field', 'data-arrow-point-cur', 'data-arrow-point'];

    (config.arrows ?? []).filter(a => a.tab === activeTab).forEach(a => {
      // We need to determine which side each from/to belongs to.
      // Store fields exist in both columns. Arrow points: data-arrow-point-cur for current, data-arrow-point for proposed.
      // For the "current" side: a field is on the current side if it appears as a store field
      // (which renders with data-cur-field) or if the arrow references it via data-arrow-point-cur.
      // Since we don't know field types from config alone, we check: any from/to that is a store field id gets added.
      // Store field ids come from config.stores.sections.fields[].id
      const allStoreFieldIds = new Set(
        (config.stores ?? []).flatMap(s => (s.sections ?? []).flatMap(sec => (sec.fields ?? []).map(f => f.id)))
      );
      if (allStoreFieldIds.has(a.from)) set.add(a.from);
      if (allStoreFieldIds.has(a.to)) set.add(a.to);
    });
    return set;
  });

  const newArrowFields = $derived.by(() => {
    return curArrowFields;
  });

  // Actually, we need per-side logic. The key distinction is:
  // On the CURRENT side, arrows go from data-cur-field → data-arrow-point-cur (dir='right')
  // or from data-arrow-point-cur → data-cur-field (dir='left')
  // On the PROPOSED side, arrows go from data-new-field → data-arrow-point (dir='left')
  // or from data-arrow-point → data-new-field (dir='right')
  //
  // The config has simple from/to. We need to determine which store fields have arrows
  // pointing AT them or FROM them on each side specifically.
  //
  // Actually, every arrow appears on BOTH sides (current store ←→ current UI, proposed store ←→ proposed UI).
  // The template duplicates arrows: each logical arrow in the config corresponds to arrows on both sides.
  // But looking at the template reference more carefully: each arrow config entry specifies ONE side.
  //
  // Re-reading the spec: "The config already has from, to, tab, dir."
  // Looking at the test config: arrows like {from: phases, to: phase-cols, dir: left}
  // This means: proposed store "phases" ←left— proposed UI "phase-cols"
  // And also: current store "phases" ←left— current UI "phase-cols"?
  //
  // Actually no — the arrows render on BOTH sides. The ArrowOverlay searches all attr types.
  // So a single config arrow creates connections on both sides automatically because
  // the store fields exist as both data-cur-field and data-new-field.
  //
  // For highlight purposes: if a store field has ANY arrow, it's highlighted on BOTH sides.
  // This is actually the simpler approach: curArrowFields and newArrowFields are the same set.

  // Get mockup components for active tab
  const currentMockupConfig = $derived(config.mockups?.[activeTab]?.current ?? null);
  const proposedMockupConfig = $derived(config.mockups?.[activeTab]?.proposed ?? null);

  const CurrentMockup = $derived(getDynamicComponent(currentMockupConfig));
  const ProposedMockup = $derived(getDynamicComponent(proposedMockupConfig));
</script>

<div class="app">
  <TopBar title={config.title} />

  <Tabs
    tabs={tabList}
    activeId={activeTab}
    variant="light"
    onselect={(id) => { activeTab = id; }}
  />

  <div class="four-col" bind:this={containerRef}>
    <ArrowOverlay
      arrows={config.arrows ?? []}
      {activeTab}
      {containerRef}
    />

    <!-- Col 1: Current Store -->
    <StoreColumn
      stores={config.stores ?? []}
      side="current"
      {activeTab}
      tabHighlights={tabHighlights}
      arrowFields={curArrowFields}
    />

    <!-- Gap 1 -->
    <div class="col-gap"></div>

    <!-- Col 2: Current UI -->
    <div class="col col-ui">
      <div class="col-header label-sm ch-muted">Current UI</div>
      <MockupFrame side="current">
        {#if CurrentMockup}
          <CurrentMockup />
        {:else}
          <div class="mock-empty">No current mockup</div>
        {/if}
      </MockupFrame>
    </div>

    <!-- Col 3: Proposed UI -->
    <div class="col col-ui">
      <div class="col-header label-sm ch-accent"><span class="dot"></span> Proposed UI</div>
      <MockupFrame side="proposed">
        {#if ProposedMockup}
          <ProposedMockup />
        {:else}
          <div class="mock-empty">No proposed mockup</div>
        {/if}
      </MockupFrame>
    </div>

    <!-- Gap 2 -->
    <div class="col-gap"></div>

    <!-- Col 4: New Store -->
    <StoreColumn
      stores={config.stores ?? []}
      side="proposed"
      {activeTab}
      tabHighlights={tabHighlights}
      arrowFields={newArrowFields}
    />
  </div>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .four-col {
    flex: 1;
    display: grid;
    grid-template-columns: auto 60px 1fr 1fr 60px auto;
    gap: 0;
    overflow: hidden;
    position: relative;
  }

  .col {
    overflow-y: auto;
  }

  .col-ui {
    display: flex;
    flex-direction: column;
  }

  .col-gap {
    width: 60px;
    flex-shrink: 0;
    background: var(--gray-50);
    border-left: 1px solid var(--gray-200);
    border-right: 1px solid var(--gray-200);
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
  }
  .ch-muted {
    background: var(--gray-100);
    color: var(--gray-500);
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

  .mock-empty {
    padding: 20px 10px;
    color: var(--gray-400);
    font-size: 10px;
    text-align: center;
    font-style: italic;
  }
</style>
