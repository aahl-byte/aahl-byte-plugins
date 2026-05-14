<script>
  const { severity, label, count, children } = $props();

  const dotColors = {
    critical: '#b91c1c',
    warning:  '#d97706',
    info:     '#2563eb',
    open:     '#7c3aed',
  };

  const dotColor = $derived(dotColors[severity] ?? '#6b7280');
</script>

<div class="lane">
  <div class="lane-header">
    <span class="lane-dot" style="background: {dotColor}"></span>
    <span class="lane-name">{label}</span>
    <span class="lane-count">{count}</span>
  </div>
  <div class="lane-body">
    {@render children?.()}
  </div>
</div>

<style>
  .lane {
    flex: 1;
    min-width: 240px;
    background: var(--gray-50);
    display: flex;
    flex-direction: column;
  }
  .lane-header {
    padding: 12px 14px;
    border-bottom: 1px solid var(--gray-200);
    position: sticky;
    top: 0;
    background: var(--gray-50);
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .lane-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .lane-name {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .5px;
    color: var(--gray-500);
  }
  .lane-count {
    font-size: 10px;
    color: var(--gray-400);
    margin-left: auto;
  }
  .lane-body {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
</style>
