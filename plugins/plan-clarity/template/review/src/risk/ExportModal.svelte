<script>
  const { visible = false, content = '', onclose } = $props();

  let copied = $state(false);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(content);
      copied = true;
      setTimeout(() => { copied = false; }, 2000);
    } catch {
      // fallback: select all text in pre
    }
  }
</script>

<div class="export-overlay" class:visible role="dialog" aria-modal="true">
  <div class="export-modal">
    <div class="export-header">
      <h2>YAML Export</h2>
      <button class="export-close" onclick={onclose} aria-label="Close">×</button>
    </div>
    <div class="export-body">
      <pre class="export-pre">{content}</pre>
    </div>
    <div class="export-footer">
      <button class="export-btn" onclick={onclose}>Close</button>
      <button class="export-btn primary" onclick={copyToClipboard}>
        {copied ? 'Copied!' : 'Copy to Clipboard'}
      </button>
    </div>
  </div>
</div>

<style>
  .export-overlay {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: rgba(0,0,0,.5);
    align-items: center;
    justify-content: center;
  }
  .export-overlay.visible {
    display: flex;
  }
  .export-modal {
    background: white;
    border-radius: 12px;
    width: 700px;
    max-width: 90vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0,0,0,.3);
  }
  .export-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--gray-200);
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .export-header h2 {
    font-size: 15px;
    font-weight: 700;
  }
  .export-close {
    margin-left: auto;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    background: var(--gray-100);
    cursor: pointer;
    font-size: 14px;
    color: var(--gray-500);
  }
  .export-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }
  .export-pre {
    background: var(--gray-900);
    color: #e5e7eb;
    padding: 16px;
    border-radius: 8px;
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.6;
    white-space: pre-wrap;
  }
  .export-footer {
    padding: 12px 20px;
    border-top: 1px solid var(--gray-200);
    display: flex;
    gap: 8px;
    justify-content: flex-end;
  }
  .export-btn {
    font-size: 12px;
    font-weight: 600;
    padding: 8px 16px;
    border-radius: 6px;
    border: 1px solid var(--gray-200);
    background: white;
    cursor: pointer;
  }
  .export-btn.primary {
    background: var(--brand);
    color: white;
    border-color: var(--brand);
  }
</style>
