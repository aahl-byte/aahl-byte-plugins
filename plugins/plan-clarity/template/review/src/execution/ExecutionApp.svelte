<script>
  import TopBar from '../shared/TopBar.svelte';
  import TOC from '../shared/TOC.svelte';
  import DetailPanel from '../shared/DetailPanel.svelte';
  import Callout from '../shared/Callout.svelte';
  import PhaseColumn from './PhaseColumn.svelte';
  import { md } from '../shared/md.js';

  const { config } = $props();

  // Computed totals
  const totalSteps = $derived(config.phases.reduce((sum, p) => sum + p.steps.length, 0));
  const phaseCount = $derived(config.phases.length);
  const migrationCount = $derived(
    config.phases.flatMap(p => p.steps).filter(s => s.risks?.includes('migration')).length
  );
  const compatCount = $derived(
    config.phases.flatMap(p => p.steps).filter(s => s.risks?.includes('compat')).length
  );

  // Cumulative step offsets per phase (for global step numbering)
  const globalStepOffsets = $derived(
    config.phases.reduce((acc, p, i) => {
      acc.push(i === 0 ? 0 : acc[i - 1] + config.phases[i - 1].steps.length);
      return acc;
    }, [])
  );

  // State
  let activeFilter = $state('all');
  let selectedStepId = $state(null);

  // TOC sections
  const tocSections = $derived([
    {
      heading: 'Phases',
      items: [
        { id: 'all', label: 'All Steps', badge: { label: String(totalSteps), variant: 'count' } },
        ...config.phases.map((p, i) => ({
          id: p.id,
          label: `${i + 1} · ${p.name}`,
          badge: { label: String(p.steps.length), variant: 'count' }
        }))
      ]
    },
    {
      heading: 'Concerns',
      items: [
        { id: 'migration', label: 'Migration', badge: { label: String(migrationCount), variant: 'risk' } },
        { id: 'compat', label: 'Compat', badge: { label: String(compatCount), variant: 'risk' } },
      ]
    }
  ]);

  // Find selected step and its phase
  const selectedStep = $derived(
    selectedStepId
      ? config.phases.flatMap(p => p.steps).find(s => s.id === selectedStepId)
      : null
  );

  const selectedPhase = $derived(
    selectedStepId
      ? config.phases.find(p => p.steps.some(s => s.id === selectedStepId))
      : null
  );

  const selectedPhaseNum = $derived(
    selectedPhase ? config.phases.indexOf(selectedPhase) + 1 : null
  );

  // Find a step by id (for dep navigation)
  function findStep(id) {
    return config.phases.flatMap(p => p.steps).find(s => s.id === id);
  }

  function navigateToDep(depId) {
    activeFilter = 'all';
    selectedStepId = depId;
  }
</script>

<div class="app">
  <TopBar
    title={config.title}
    tags={[{ label: `${totalSteps} steps · ${phaseCount} phases`, variant: 'default' }]}
  />

  <div class="body">
    <TOC
      sections={tocSections}
      activeId={activeFilter}
      onselect={(id) => { activeFilter = id; }}
    />

    <div class="phases">
      {#each config.phases as phase, i}
        <PhaseColumn
          {phase}
          phaseNum={i + 1}
          {selectedStepId}
          filter={activeFilter}
          globalStepOffset={globalStepOffsets[i]}
          onStepSelect={(id) => { selectedStepId = id; }}
        />
      {/each}
    </div>

    <DetailPanel activeId={selectedStepId} emptyMessage="Select a step to view details">
      {#if selectedStep}
        <div class="detail-title">{selectedStep.name}</div>
        {#if selectedPhase}
          <div class="detail-phase">Phase {selectedPhaseNum} · {selectedPhase.name}</div>
        {/if}

        {#if selectedStep.detail?.description}
          <div class="detail-section">
            <div class="detail-section-title dst-desc">Description</div>
            <div class="detail-text">{@html md(selectedStep.detail.description)}</div>
          </div>
        {/if}

        {#if selectedStep.deps?.length}
          <div class="detail-section">
            <div class="detail-section-title dst-dep">Dependencies</div>
            <ul class="detail-dep-list">
              {#each selectedStep.deps as depId}
                {@const depStep = findStep(depId)}
                <li>
                  {#if depStep}
                    <span
                      class="detail-dep-link"
                      role="button"
                      tabindex="0"
                      onclick={() => navigateToDep(depId)}
                      onkeydown={(e) => e.key === 'Enter' && navigateToDep(depId)}
                    >{depId} — {depStep.name}</span>
                  {:else}
                    <span>{depId}</span>
                  {/if}
                </li>
              {/each}
            </ul>
          </div>
        {/if}

        {#if selectedStep.detail?.migration}
          <div class="detail-section">
            <div class="detail-section-title dst-migration">Migration</div>
            <Callout variant="migration" label={selectedStep.detail.migration.label}>
              <div class="detail-text">{@html md(selectedStep.detail.migration.body)}</div>
            </Callout>
          </div>
        {/if}

        {#if selectedStep.detail?.compat}
          <div class="detail-section">
            <div class="detail-section-title dst-danger">Compat</div>
            <Callout variant="compat" label={selectedStep.detail.compat.label}>
              <div class="detail-text">{@html md(selectedStep.detail.compat.body)}</div>
            </Callout>
          </div>
        {/if}

        {#if selectedStep.detail?.codeRefs?.length}
          <div class="detail-section">
            <div class="detail-section-title dst-code">Code Refs</div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              {#each selectedStep.detail.codeRefs as ref}
                <span class="code-ref">{ref}</span>
              {/each}
            </div>
          </div>
        {/if}
      {/if}
    </DetailPanel>
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
  .body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  .phases {
    flex: 1;
    display: flex;
    gap: 1px;
    background: var(--gray-200);
    overflow-x: auto;
    overflow-y: hidden;
  }
  .detail-phase {
    font-size: 11px;
    color: var(--gray-400);
    text-transform: uppercase;
    letter-spacing: .5px;
    margin-bottom: 16px;
  }
  .detail-dep-list {
    list-style: none;
    padding: 0;
  }
  .detail-dep-list li {
    font-size: 12px;
    padding: 4px 0;
    color: var(--gray-600);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .detail-dep-list li::before {
    content: '→';
    color: var(--blue);
    font-weight: 700;
  }
  .detail-dep-link {
    color: var(--blue);
    cursor: pointer;
    text-decoration: underline;
    text-decoration-style: dotted;
  }
  .detail-dep-link:hover {
    text-decoration-style: solid;
  }
</style>
