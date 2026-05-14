<script>
  const { tabs, activeId = $bindable(''), variant = 'light', onselect } = $props();

  function handleClick(tab) {
    onselect?.(tab.id);
  }

  function activeTabStyle(tab) {
    if (variant === 'light' && tab.color) {
      return `color: ${tab.color}; border-bottom-color: ${tab.color}`;
    }
    return '';
  }
</script>

<div class="tabs" class:tabs-light={variant === 'light'} class:tabs-dark={variant === 'dark'}>
  {#each tabs as tab}
    <button
      class="tab"
      class:active={activeId === tab.id}
      style={activeId === tab.id ? activeTabStyle(tab) : ''}
      onclick={() => handleClick(tab)}
    >
      {tab.label}
    </button>
  {/each}
</div>

<style>
  .tabs {
    display: flex;
    gap: 0;
    flex-shrink: 0;
  }
  button {
    border: none;
    background: none;
    cursor: pointer;
    font-family: inherit;
  }

  /* Light variant */
  .tabs-light {
    background: white;
    border-bottom: 2px solid var(--gray-200);
    justify-content: center;
  }
  .tabs-light .tab {
    padding: 8px 20px;
    font-size: 11px;
    font-weight: 600;
    color: var(--gray-400);
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: all .1s;
  }
  .tabs-light .tab:hover {
    color: var(--gray-600);
    background: var(--gray-50);
  }
  .tabs-light .tab.active {
    border-bottom-color: currentColor;
  }

  /* Dark variant */
  .tabs-dark {
    background: var(--gray-700);
    border-bottom: 1px solid #374151;
  }
  .tabs-dark .tab {
    padding: 6px 14px;
    font-size: 10px;
    font-family: var(--font-mono);
    color: var(--gray-400);
    border-bottom: 2px solid transparent;
    transition: all .1s;
  }
  .tabs-dark .tab:hover {
    color: var(--gray-300);
    background: rgba(255, 255, 255, .06);
  }
  .tabs-dark .tab.active {
    color: white;
    border-bottom-color: var(--brand);
    background: var(--gray-800);
  }
</style>
