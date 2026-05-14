<script>
  const { type = 'existing', children } = $props();
</script>

<div
  class="cb-line"
  class:existing={type === 'existing'}
  class:dim={type === 'dim'}
  class:new-line={type === 'new'}
  class:edit-line={type === 'edit'}
  class:del-line={type === 'del'}
>{@render children?.()}</div>

<style>
  .cb-line {
    padding: 0 16px;
    min-height: 18px;
    color: #d1d5db;
    white-space: pre;
  }
  .existing {
    color: #6b7280;
  }
  .dim {
    color: #4b5563;
  }
  .new-line {
    background: rgba(34, 197, 94, .12);
    border-left: 3px solid #22c55e;
    padding-left: 13px;
  }
  .edit-line {
    background: rgba(217, 119, 6, .10);
    border-left: 3px solid var(--amber);
    padding-left: 13px;
  }
  .del-line {
    background: rgba(185, 28, 28, .12);
    border-left: 3px solid var(--red);
    padding-left: 13px;
    color: #ef4444;
    text-decoration: line-through;
  }
</style>
