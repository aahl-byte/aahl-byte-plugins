<script>
  const { title, subtitle = '', tags = [], children } = $props();

  function tagStyle(variant) {
    if (variant === 'new') return 'background: var(--green-bg); color: var(--green)';
    if (variant === 'del') return 'background: var(--red-bg); color: var(--red)';
    // 'mod' and 'default' both use amber
    return 'background: var(--amber-bg); color: var(--amber)';
  }
</script>

<div class="top-bar">
  <h1>{title}{subtitle ? ` — ${subtitle}` : ''}</h1>
  {#each tags as tag}
    <span class="tag" style={tagStyle(tag.variant ?? 'default')}>{tag.label}</span>
  {/each}
  <div class="spacer"></div>
  {@render children?.()}
</div>

<style>
  .top-bar {
    background: var(--gray-800);
    color: white;
    padding: 10px 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    border-bottom: 1px solid var(--gray-700);
    flex-shrink: 0;
  }
  .top-bar h1 {
    font-size: 14px;
    font-weight: 600;
  }
  .tag {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 4px;
    letter-spacing: .5px;
  }
  .spacer {
    flex: 1;
  }
</style>
