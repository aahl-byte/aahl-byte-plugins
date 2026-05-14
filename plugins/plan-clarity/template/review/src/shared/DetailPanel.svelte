<script>
  const { emptyMessage = 'Select an item to view details', activeId = null, width = '360px', children, footer } = $props();
</script>

<aside class="detail" style="width: {width}; min-width: {width}">
  {#if activeId === null || activeId === undefined}
    <div class="detail-empty">{emptyMessage}</div>
  {:else}
    <div class="detail-scroll">
      {@render children?.()}
    </div>
    {#if footer}
      {@render footer()}
    {/if}
  {/if}
</aside>

<style>
  .detail {
    border-left: 1px solid var(--gray-200);
    background: white;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  .detail-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--gray-400);
    font-size: 13px;
    font-style: italic;
    padding: 20px;
    text-align: center;
  }
  .detail-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  /* Exported utility classes for consumers to use in their detail content */
  :global(.detail-title) {
    font-size: 15px;
    font-weight: 700;
    color: var(--gray-900);
    margin-bottom: 4px;
  }
  :global(.detail-section) {
    margin-bottom: 16px;
  }
  :global(.detail-section-title) {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .5px;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--gray-100);
  }
  :global(.dst-desc)       { color: var(--gray-500); }
  :global(.dst-dep)        { color: var(--blue); }
  :global(.dst-migration)  { color: var(--amber); }
  :global(.dst-danger)     { color: var(--red); }
  :global(.dst-code)       { color: var(--purple); }
  :global(.dst-impact)     { color: var(--red); }
  :global(.dst-mitigation) { color: var(--green); }
  :global(.dst-context)    { color: var(--blue); }
  :global(.dst-options)    { color: var(--purple); }

  :global(.detail-text) {
    font-size: 12px;
    color: var(--gray-700);
    line-height: 1.6;
  }
  :global(.detail-summary) {
    font-size: 13px;
    color: var(--gray-600);
    line-height: 1.7;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--gray-200);
  }
  :global(.detail-summary strong),
  :global(.detail-text strong) {
    color: var(--gray-800);
  }
  :global(.detail-summary pre),
  :global(.detail-text pre),
  :global(.callout pre) {
    background: var(--gray-900);
    color: var(--gray-300);
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 1.6;
    padding: 10px 12px;
    border-radius: 6px;
    margin: 8px 0;
    overflow-x: auto;
    white-space: pre;
  }
  :global(.detail-summary pre code),
  :global(.detail-text pre code),
  :global(.callout pre code) {
    background: none;
    padding: 0;
    border-radius: 0;
    font-size: inherit;
    color: inherit;
  }
  :global(.detail-summary code),
  :global(.detail-text code),
  :global(.callout code) {
    font-family: var(--font-mono);
    font-size: 11px;
    background: var(--gray-200);
    padding: 1px 5px;
    border-radius: 3px;
  }
  :global(.detail-summary ul),
  :global(.detail-text ul) {
    margin: 6px 0 6px 18px;
  }
  :global(.detail-summary li),
  :global(.detail-text li) {
    margin-bottom: 3px;
  }
  :global(.code-ref) {
    font-size: 11px;
    font-family: var(--font-mono);
    background: var(--gray-100);
    padding: 2px 6px;
    border-radius: 3px;
    color: var(--purple);
  }
</style>
