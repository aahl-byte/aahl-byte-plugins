<script>
  const { side, children } = $props();
</script>

<div class="mockup-frame mock" class:mockup-current={side === 'current'} class:mockup-proposed={side === 'proposed'}>
  {@render children?.()}
</div>

<style>
  .mockup-frame {
    font-family: -apple-system, sans-serif;
    font-size: 10px;
    line-height: 1.4;
    padding: 8px;
  }

  .mockup-frame :global(.mock-section) {
    border: 1px solid var(--gray-200);
    border-radius: 4px;
    margin: 4px 0;
    overflow: hidden;
  }
  .mockup-frame :global(.mock-section.mock-new) {
    border-color: var(--green);
    border-style: dashed;
  }
  .mockup-frame :global(.mock-section.mock-removed) {
    border-color: var(--red);
    opacity: .4;
    text-decoration: line-through;
  }
  .mockup-frame :global(.mock-section-header) {
    padding: 2px 6px;
    font-size: 7px;
    background: var(--gray-50);
    color: var(--gray-500);
    border-bottom: 1px solid var(--gray-100);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .3px;
  }
  .mockup-frame :global(.mock-section.mock-new .mock-section-header) {
    background: var(--green-bg);
    color: var(--green);
  }
  .mockup-frame :global(.mock-section-body) {
    padding: 4px 6px;
  }
  .mockup-frame :global(.mock-card) {
    border: 1px solid var(--gray-200);
    border-radius: 4px;
    padding: 4px 6px;
    margin: 3px 0;
    background: white;
  }
  .mockup-frame :global(.mock-card.mock-frozen) {
    background: var(--gray-50);
  }
  .mockup-frame :global(.mock-btn) {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 3px;
    font-size: 7px;
    font-weight: 600;
    color: white;
    background: var(--brand);
    cursor: default;
  }
  .mockup-frame :global(.mock-empty) {
    padding: 20px 10px;
    color: var(--gray-400);
    font-size: 10px;
    text-align: center;
    font-style: italic;
  }
  .mockup-frame :global(.mock-field-label) {
    font-size: 7px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .3px;
    color: var(--gray-400);
    margin-top: 2px;
  }
  .mockup-frame :global(.mock-field-value) {
    font-size: 8px;
    color: var(--gray-700);
  }
  .mockup-frame :global(.mock-row) {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 8px;
  }
  .mockup-frame :global(.mock-badge) {
    font-size: 6px;
    font-weight: 700;
    padding: 0 3px;
    border-radius: 2px;
    background: var(--gray-200);
    color: var(--gray-500);
  }
  .mockup-frame :global(.mock-textarea) {
    background: var(--gray-50);
    border: 1px solid var(--gray-200);
    border-radius: 2px;
    padding: 2px 5px;
    color: var(--gray-400);
    font-size: 8px;
    margin: 2px 0;
    width: 100%;
  }
  .mockup-frame :global(.mock-input-row) {
    display: flex;
    gap: 3px;
    margin: 3px 0;
  }
  .mockup-frame :global(.mock-input) {
    flex: 1;
    background: white;
    border: 1px solid var(--gray-200);
    border-radius: 2px;
    padding: 2px 4px;
    font-size: 8px;
    color: var(--gray-400);
  }
  .mockup-frame :global(.mock-send) {
    padding: 2px 5px;
    background: var(--brand);
    color: white;
    border-radius: 2px;
    font-size: 7px;
    font-weight: 700;
  }
  .mockup-frame :global(.mock-removed-label) {
    font-size: 7px;
    color: var(--red);
  }
  .mockup-frame :global(.text-muted) {
    color: var(--gray-400);
  }
  .mockup-frame :global(.text-center) {
    text-align: center;
  }
  .mockup-frame :global(.text-7) {
    font-size: 7px;
  }
  .mockup-frame :global(.text-8) {
    font-size: 8px;
  }
  .mockup-frame :global(.text-9) {
    font-size: 9px;
  }
  .mockup-frame :global(.mt-2) {
    margin-top: 2px;
  }
  .mockup-frame :global(.mt-3) {
    margin-top: 3px;
  }
  .mockup-frame :global(.mt-4) {
    margin-top: 4px;
  }
</style>
