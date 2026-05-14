<script>
  const { file, traceIds = [], activeTraceId = '', children } = $props();

  const isHighlighted = $derived(traceIds.includes(activeTraceId));
</script>

<div class="code-section" class:highlighted={isHighlighted}>
  {@render children?.()}
</div>

<style>
  .code-section {
    position: relative;
    transition: all .2s;
  }
  .highlighted {
    background: rgba(0, 200, 255, .06);
  }
  .highlighted::before {
    content: '';
    position: absolute;
    inset: -3px 6px;
    border: 2px solid rgba(0, 200, 255, .8);
    border-radius: 6px;
    box-shadow:
      0 0 20px rgba(0, 200, 255, .5),
      0 0 40px rgba(0, 200, 255, .25),
      inset 0 0 20px rgba(0, 200, 255, .08);
    pointer-events: none;
    animation: glow-pulse 1.5s ease-in-out infinite;
  }
  @keyframes glow-pulse {
    0%, 100% {
      box-shadow:
        0 0 20px rgba(0, 200, 255, .5),
        0 0 40px rgba(0, 200, 255, .25),
        inset 0 0 20px rgba(0, 200, 255, .08);
    }
    50% {
      box-shadow:
        0 0 30px rgba(0, 200, 255, .7),
        0 0 60px rgba(0, 200, 255, .35),
        inset 0 0 30px rgba(0, 200, 255, .12);
    }
  }
</style>
