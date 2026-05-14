<script>
  import TopBar from '../shared/TopBar.svelte';
  import TOC from '../shared/TOC.svelte';
  import SchemaCard from './SchemaCard.svelte';
  import EndpointCard from './EndpointCard.svelte';

  const { config } = $props();

  // Dynamic code file imports (recursive to support per-facet subdirectories)
  const dynamicModules = import.meta.glob('/dynamic/**/*.svelte', { eager: true });

  function getDynamicComponent(fileId) {
    if (!fileId) return null;
    const match = Object.entries(dynamicModules).find(([path]) =>
      path.endsWith(`/${fileId}.svelte`)
    );
    return match?.[1]?.default ?? null;
  }

  // Summary tag
  const schemaCount = $derived(config.schemas?.length ?? 0);
  const endpointCount = $derived(config.endpoints?.length ?? 0);
  const newSchemas = $derived((config.schemas ?? []).filter(s => s.status === 'new').length);
  const newEndpoints = $derived((config.endpoints ?? []).filter(e => e.status === 'new').length);

  const summaryParts = $derived.by(() => {
    const parts = [];
    if (schemaCount) parts.push(`${schemaCount} ${schemaCount === 1 ? 'Table' : 'Tables'}`);
    if (endpointCount) parts.push(`${endpointCount} ${endpointCount === 1 ? 'Endpoint' : 'Endpoints'}`);
    return parts.join(' · ');
  });

  // TOC sections
  const tocSections = $derived.by(() => {
    const sections = [];

    if (config.schemas?.length) {
      sections.push({
        heading: 'Schema',
        items: config.schemas.map(s => ({
          id: s.id,
          label: s.table,
          badge: { label: s.status, variant: s.status }
        }))
      });
    }

    if (config.endpoints?.length) {
      sections.push({
        heading: 'API Endpoints',
        items: config.endpoints.map(e => ({
          id: e.id,
          label: e.path,
          prefix: e.method,
          prefixColor: e.status === 'new' ? 'var(--green)' : e.status === 'del' ? 'var(--red)' : 'var(--amber)',
          badge: { label: e.status, variant: e.status }
        }))
      });
    }

    return sections;
  });

  // Scroll-spy state
  // svelte-ignore state_referenced_locally
  let activeId = $state(
    config.schemas?.[0]?.id ?? config.endpoints?.[0]?.id ?? ''
  );

  // Collect all card IDs in DOM order
  const allIds = $derived([
    ...(config.schemas ?? []).map(s => s.id),
    ...(config.endpoints ?? []).map(e => e.id),
  ]);

  // Handle TOC click — scroll to card
  function handleTOCSelect(id) {
    activeId = id;
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Scroll-spy: IntersectionObserver approach
  let mainEl = $state(null);

  $effect(() => {
    if (!mainEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            activeId = entry.target.id;
            break;
          }
        }
      },
      {
        root: mainEl,
        threshold: 0.15,
        rootMargin: '-10% 0px -60% 0px',
      }
    );

    // Observe all card elements
    const panels = mainEl.querySelectorAll('.panel[id]');
    panels.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  });
</script>

<div class="app">
  <TopBar
    title={config.title}
    tags={[{
      label: summaryParts,
      variant: 'new'
    }]}
  />

  <div class="main-layout">
    <TOC
      sections={tocSections}
      activeId={activeId}
      marginTop="8px"
      onselect={handleTOCSelect}
    />

    <div class="main" bind:this={mainEl}>
      <!-- Schema Section -->
      {#if config.schemas?.length}
        <div class="section" id="sec-schema">
          <div class="section-header">
            <h2>Schema &harr; API Output &harr; Query</h2>
          </div>
          {#each config.schemas as schema}
            <SchemaCard
              {schema}
              dynamicComponent={getDynamicComponent(schema.codeFile)}
              {activeId}
            />
          {/each}
        </div>
      {/if}

      <!-- Endpoints Section -->
      {#if config.endpoints?.length}
        <div class="section" id="sec-endpoints">
          <div class="section-header">
            <h2>API Endpoints</h2>
          </div>
          {#each config.endpoints as endpoint}
            <EndpointCard
              {endpoint}
              dynamicComponent={getDynamicComponent(endpoint.codeFile)}
              {activeId}
            />
          {/each}
        </div>
      {/if}
    </div>
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

  .main-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .main {
    flex: 1;
    overflow-y: auto;
  }

  .section {
    padding: 20px 24px 32px;
    border-bottom: 2px solid var(--gray-200);
  }
  .section:last-child {
    border-bottom: none;
    margin-bottom: 50vh;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }
  .section-header h2 {
    font-size: 16px;
    font-weight: 700;
    color: var(--gray-800);
  }
</style>
