<script>
  import Tabs from './shared/Tabs.svelte';
  import ExecutionApp from './execution/ExecutionApp.svelte';
  import RiskApp from './risk/RiskApp.svelte';
  import LogicApp from './logic/LogicApp.svelte';
  import DataApp from './data/DataApp.svelte';
  import LayoutApp from './layout/LayoutApp.svelte';

  const { configs, initialType } = $props();

  const apps = { execution: ExecutionApp, risk: RiskApp, logic: LogicApp, data: DataApp, layout: LayoutApp };
  const labels = { execution: 'Execution', risk: 'Risk', logic: 'Logic', data: 'Data', layout: 'Layout' };

  const types = $derived(Object.keys(configs));
  let activeType = $state(initialType);

  const tabs = $derived(types.map(t => ({ id: t, label: labels[t] || t })));
  const ReviewApp = $derived(apps[activeType]);
  const activeConfig = $derived(configs[activeType]);
</script>

{#if types.length > 1}
  <Tabs {tabs} bind:activeId={activeType} variant="light" onselect={(id) => activeType = id} />
{/if}

{#if ReviewApp && activeConfig}
  <ReviewApp config={activeConfig} />
{:else}
  <p>Unknown review type: {activeType}</p>
{/if}
