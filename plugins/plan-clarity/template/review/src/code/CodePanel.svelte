<script>
  import Tabs from '../shared/Tabs.svelte';

  const { files = [], activeTraceId = '', children } = $props();

  let activeFileId = $state(files[0]?.id ?? '');
</script>

<div class="col-code">
  <Tabs
    tabs={files.map(f => ({ id: f.id, label: f.label }))}
    activeId={activeFileId}
    variant="dark"
    onselect={(id) => { activeFileId = id; }}
  />
  <div class="cb-body">
    {@render children?.()}
  </div>
</div>

<style>
  .col-code {
    background: var(--gray-900);
    overflow-y: auto;
    flex: 1;
    min-width: 300px;
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
</style>
