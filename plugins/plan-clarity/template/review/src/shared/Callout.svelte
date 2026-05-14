<script>
  const { variant, label, children } = $props();

  const variantStyles = {
    migration:  { border: 'var(--amber)', bg: 'var(--amber-bg)', labelColor: 'var(--amber)' },
    compat:     { border: 'var(--red)',   bg: 'var(--red-bg)',   labelColor: 'var(--red)'   },
    impact:     { border: 'var(--red)',   bg: 'var(--red-bg)',   labelColor: 'var(--red)'   },
    mitigation: { border: 'var(--green)', bg: 'var(--green-bg)', labelColor: 'var(--green)' },
    'option-a': { border: 'var(--green)', bg: 'var(--green-bg)', labelColor: 'var(--green)' },
    'option-b': { border: 'var(--amber)', bg: 'var(--amber-bg)', labelColor: 'var(--amber)' },
    'option-c': { border: 'var(--red)',   bg: 'var(--red-bg)',   labelColor: 'var(--red)'   },
  };

  const v = $derived(variantStyles[variant] ?? variantStyles.migration);
  const calloutStyle = $derived(`border-left: 3px solid ${v.border}; background: ${v.bg}`);
  const labelStyle   = $derived(`color: ${v.labelColor}`);
</script>

<div class="callout" style={calloutStyle}>
  <div class="co-label" style={labelStyle}>{label}</div>
  {@render children?.()}
</div>

<style>
  .callout {
    padding: 8px 10px;
    border-radius: 6px;
    font-size: 12px;
    line-height: 1.5;
    margin-bottom: 6px;
  }
  .co-label {
    font-weight: 700;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .3px;
  }
</style>
