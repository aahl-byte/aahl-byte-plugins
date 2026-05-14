<script>
  import StepCard from './StepCard.svelte';

  const { phase, phaseNum, selectedStepId, filter, globalStepOffset, onStepSelect } = $props();

  const visibleSteps = $derived(() => {
    if (filter === 'all' || filter === phase.id) return phase.steps;
    if (filter === 'migration' || filter === 'compat') return phase.steps.filter(s => s.risks?.includes(filter));
    return [];
  });

  const showColumn = $derived(() => {
    if (filter === 'all' || filter === phase.id) return true;
    if (filter === 'migration' || filter === 'compat') return phase.steps.some(s => s.risks?.includes(filter));
    return false;
  });
</script>

{#if showColumn()}
  <div class="phase">
    <div class="phase-header">
      <div class="phase-name">{phaseNum} · {phase.name}</div>
      <div class="phase-count">{visibleSteps().length} step{visibleSteps().length === 1 ? '' : 's'}</div>
    </div>
    <div class="phase-body">
      {#each visibleSteps() as step, i}
        <StepCard
          {step}
          num={globalStepOffset + phase.steps.indexOf(step) + 1}
          selected={selectedStepId === step.id}
          onclick={() => onStepSelect(step.id)}
        />
      {/each}
    </div>
  </div>
{/if}

<style>
  .phase { flex: 1; min-width: 300px; background: var(--gray-50); display: flex; flex-direction: column; }
  .phase-header { padding: 12px 14px; border-bottom: 1px solid var(--gray-200); position: sticky; top: 0; background: var(--gray-50); z-index: 1; }
  .phase-name { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: var(--gray-500); }
  .phase-count { font-size: 10px; color: var(--gray-400); margin-top: 2px; }
  .phase-body { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 6px; }
</style>
