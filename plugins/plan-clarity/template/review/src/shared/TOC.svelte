<script>
  import Badge from './Badge.svelte';

  /**
   * @typedef {{ id: string, label: string, badge?: {label: string, variant: string}, prefix?: string, prefixColor?: string, dot?: string }} TOCItem
   * @typedef {{ heading: string, items: TOCItem[] }} TOCSection
   */

  const { sections, activeId = $bindable(''), marginTop = '', onselect } = $props();

  function handleClick(item) {
    onselect?.(item.id);
  }
</script>

<nav class="toc">
  {#each sections as section, i}
    {#if i > 0 && marginTop}
      <div style="margin-top: {marginTop}"></div>
    {/if}
    <div class="toc-heading">{section.heading}</div>
    {#each section.items as item}
      <div
        class="toc-item"
        class:active={activeId === item.id}
        role="button"
        tabindex="0"
        onclick={() => handleClick(item)}
        onkeydown={(e) => e.key === 'Enter' && handleClick(item)}
      >
        {#if item.dot}
          <span class="dot" style="background: {item.dot}"></span>
        {/if}
        {#if item.prefix}
          <span class="prefix" style="color: {item.prefixColor ?? 'inherit'}">{item.prefix}</span>
        {/if}
        <span class="label">{item.label}</span>
        {#if item.badge}
          <span style="margin-left: auto">
            <Badge variant={item.badge.variant} label={item.badge.label} />
          </span>
        {/if}
      </div>
    {/each}
  {/each}
</nav>

<style>
  .toc {
    width: fit-content;
    max-width: 320px;
    min-width: 140px;
    background: var(--gray-100);
    border-right: 1px solid var(--gray-200);
    overflow-y: auto;
    padding: 12px 0;
    flex-shrink: 0;
  }
  .toc-heading {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .8px;
    color: var(--gray-400);
    padding: 8px 16px 4px;
  }
  .toc-item {
    font-size: 12px;
    padding: 6px 16px;
    cursor: pointer;
    color: var(--gray-600);
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all .1s;
    white-space: nowrap;
  }
  .toc-item:hover {
    background: var(--gray-200);
    color: var(--gray-800);
  }
  .toc-item.active {
    background: var(--brand-light);
    color: var(--brand);
    font-weight: 600;
    border-right: 3px solid var(--brand);
  }
  .dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .prefix {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .label {
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
