<script>
  const { finding, selected = false, statusClass = '', onclick } = $props();

  const catColors = {
    perm:      '#7c3aed',
    perf:      '#d97706',
    cross:     '#2563eb',
    migration: '#d97706',
    compat:    '#b91c1c',
    decision:  '#15803d',
    clarity:   '#6b7280',
  };

  const catColor = $derived(catColors[finding.category] ?? '#6b7280');
</script>

<div
  class="finding"
  class:selected
  class:status-ignore={statusClass === 'status-ignore'}
  class:status-acceptfix={statusClass === 'status-acceptfix'}
  class:status-discuss={statusClass === 'status-discuss'}
  class:has-note={statusClass === 'has-note'}
  role="button"
  tabindex="0"
  {onclick}
  onkeydown={(e) => e.key === 'Enter' && onclick?.()}
>
  <div class="finding-header">
    <span class="cat-dot" style="background: {catColor}"></span>
    <span class="finding-cat" style="color: {catColor}">{finding.category}</span>
  </div>
  <div class="finding-name">{finding.name}</div>
  <div class="finding-summary">{finding.summary}</div>
  {#if finding.location}
    <div class="finding-loc">{finding.location}</div>
  {/if}
  <div class="finding-status-dot"></div>
</div>

<style>
  .finding {
    background: white;
    border: 1px solid var(--gray-200);
    border-radius: 8px;
    padding: 10px 12px;
    cursor: pointer;
    transition: all .15s;
    position: relative;
  }
  .finding:hover {
    border-color: var(--brand);
    box-shadow: 0 2px 8px rgba(0,90,112,.08);
  }
  .finding.selected {
    border-color: var(--brand);
    background: var(--brand-light);
  }
  .finding-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }
  .cat-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .finding-cat {
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .3px;
  }
  .finding-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--gray-800);
  }
  .finding-summary {
    font-size: 11px;
    color: var(--gray-500);
    margin-top: 2px;
    line-height: 1.4;
  }
  .finding-loc {
    font-size: 10px;
    color: var(--gray-400);
    margin-top: 4px;
    font-family: var(--font-mono);
  }
  .finding-status-dot {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: none;
  }
  .finding.status-ignore .finding-status-dot {
    display: block;
    background: var(--green);
  }
  .finding.status-acceptfix .finding-status-dot {
    display: block;
    background: var(--red);
  }
  .finding.status-discuss .finding-status-dot {
    display: block;
    background: var(--amber);
  }
  .finding.has-note .finding-status-dot {
    display: block;
    background: var(--blue);
  }
</style>
