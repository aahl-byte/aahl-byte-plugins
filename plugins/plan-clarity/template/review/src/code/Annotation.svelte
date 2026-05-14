<script>
  const { children } = $props();
</script>

<div class="cb-annotation">{@render children?.()}</div>

<style>
  .cb-annotation {
    background: #1e3a5f;
    border-left: 3px solid #3b82f6;
    padding: 6px 16px;
    margin: 2px 0;
    color: #93c5fd;
    font-family: -apple-system, sans-serif;
    font-size: 11px;
    line-height: 1.5;
  }
  :global(strong) {
    color: #bfdbfe;
  }
</style>
