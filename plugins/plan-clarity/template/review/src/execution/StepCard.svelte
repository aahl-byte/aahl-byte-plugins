<script>
  const { step, num, selected = false, onclick } = $props();
</script>

<svg style="display:none">
  <symbol id="icon-note" viewBox="0 0 16 16" fill="none" stroke="var(--gray-500)" stroke-width="1.5">
    <path d="M4 1h6l4 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z"/>
    <path d="M10 1v4h4"/>
    <path d="M5.5 8h5M5.5 11h3"/>
  </symbol>
</svg>

<div
  class="step"
  class:selected
  role="button"
  tabindex="0"
  {onclick}
  onkeydown={(e) => e.key === 'Enter' && onclick?.()}
>
  <div class="step-header">
    <span class="step-num">{num}</span>
    <span class="step-name">{step.name}</span>
  </div>
  <div class="step-desc">{step.desc}</div>

  {#if step.risks?.length}
    <div class="step-tags">
      {#each step.risks as risk}
        <span class="step-tag {risk === 'migration' ? 'st-migration' : risk === 'compat' ? 'st-danger' : ''}">
          {risk}
        </span>
      {/each}
    </div>
  {/if}

  {#if step.detail}
    <svg class="step-notes-icon" aria-hidden="true">
      <use href="#icon-note" />
    </svg>
  {/if}

  {#if step.deps?.length}
    <span class="step-dep-count">dep {step.deps.join(',')}</span>
  {/if}
</div>

<style>
  .step { background: white; border: 1px solid var(--gray-200); border-radius: 8px; padding: 10px 12px; cursor: pointer; transition: all .15s; position: relative; }
  .step:hover { border-color: var(--brand); box-shadow: 0 2px 8px rgba(0,90,112,.08); }
  .step.selected { border-color: var(--brand); background: var(--brand-light); }
  .step-header { display: flex; align-items: start; gap: 8px; }
  .step-name { font-size: 12px; font-weight: 600; color: var(--gray-800); line-height: 1.4; flex: 1; }
  .step-desc { font-size: 11px; color: var(--gray-500); margin-top: 2px; padding-left: 18px; }
  .step-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px; padding-left: 18px; }
  .step-tag { font-size: 9px; font-weight: 600; padding: 1px 6px; border-radius: 3px; text-transform: uppercase; letter-spacing: .3px; }
  .st-migration { background: var(--amber-bg); color: var(--amber); }
  .st-danger { background: var(--red-bg); color: var(--red); }
  .step-num { font-size: 10px; font-weight: 700; color: var(--gray-400); min-width: 14px; flex-shrink: 0; margin-top: 2px; }
  .step-notes-icon { position: absolute; top: 7px; right: 8px; width: 12px; height: 12px; opacity: .45; }
  .step:hover .step-notes-icon { opacity: .7; }
  .step-dep-count { position: absolute; bottom: 6px; right: 8px; font-size: 9px; font-weight: 700; color: var(--blue); opacity: .5; }
  .step:hover .step-dep-count { opacity: .8; }
</style>
