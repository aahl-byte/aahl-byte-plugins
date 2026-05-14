<script>
  const { variant, label } = $props();

  const styles = {
    new:   'background: var(--green-bg); color: var(--green)',
    mod:   'background: var(--amber-bg); color: var(--amber)',
    del:   'background: var(--red-bg); color: var(--red)',
    count: 'background: var(--gray-200); color: var(--gray-500)',
    crit:  'background: var(--red-bg); color: var(--red)',
    risk:  'background: var(--red-bg); color: var(--red)',
  };

  const badgeStyle = $derived(styles[variant] ?? styles.count);
</script>

<span class="badge" style={badgeStyle}>{label}</span>

<style>
  .badge {
    font-size: 9px;
    font-weight: 600;
    padding: 1px 5px;
    border-radius: 3px;
  }
</style>
