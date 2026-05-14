<script>
  const {
    findingId,
    decisionOptions = [],
    status = '',
    decision = '',
    note = '',
    onstatuschange,
    ondecisionchange,
    onnotechange,
  } = $props();

  const STATUS_LABELS = {
    ignore:    { label: 'Ignore',     cls: 'active-ignore',    tip: 'Reviewed — risk is acceptable, no action needed' },
    acceptfix: { label: 'Accept Fix', cls: 'active-acceptfix', tip: 'Agree with the suggested mitigation — will implement' },
    discuss:   { label: 'Discuss',    cls: 'active-discuss',   tip: 'Needs stakeholder discussion before deciding' },
  };

  function toggleStatus(s) {
    onstatuschange?.(status === s ? '' : s);
  }

  function toggleDecision(id) {
    ondecisionchange?.(decision === id ? '' : id);
  }

  function handleNote(e) {
    onnotechange?.(e.target.value);
  }
</script>

<div class="note-footer">
  <div class="note-status-row">
    {#each Object.entries(STATUS_LABELS) as [key, info]}
      <button
        class="status-btn"
        class:active-ignore={status === key && key === 'ignore'}
        class:active-acceptfix={status === key && key === 'acceptfix'}
        class:active-discuss={status === key && key === 'discuss'}
        title={info.tip}
        onclick={() => toggleStatus(key)}
      >{info.label}</button>
    {/each}
  </div>

  {#if decisionOptions.length > 0}
    <div class="decision-group">
      <div class="decision-group-label">Decision Options</div>
      {#each decisionOptions as opt}
        <div
          class="decision-option"
          class:chosen={decision === opt.id}
          role="button"
          tabindex="0"
          onclick={() => toggleDecision(opt.id)}
          onkeydown={(e) => e.key === 'Enter' && toggleDecision(opt.id)}
        >
          <span class="decision-radio"></span>
          <span>{opt.id}: {opt.label}</span>
          {#if opt.recommended}
            <span class="decision-rec">rec</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <textarea
    class="note-textarea"
    placeholder="Add notes…"
    value={note}
    oninput={handleNote}
  ></textarea>
</div>

<style>
  .note-footer {
    border-top: 2px solid var(--gray-200);
    padding: 12px 20px;
    background: var(--gray-50);
    flex-shrink: 0;
  }
  .note-status-row {
    display: flex;
    gap: 4px;
    margin-bottom: 8px;
  }
  .status-btn {
    font-size: 10px;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 4px;
    border: 1px solid var(--gray-200);
    background: white;
    cursor: pointer;
    transition: all .15s;
    color: var(--gray-400);
    text-transform: uppercase;
    letter-spacing: .3px;
  }
  .status-btn:hover {
    border-color: var(--gray-300);
    color: var(--gray-600);
  }
  .status-btn.active-ignore {
    border-color: var(--green);
    background: var(--green-bg);
    color: var(--green);
  }
  .status-btn.active-acceptfix {
    border-color: var(--red);
    background: var(--red-bg);
    color: var(--red);
  }
  .status-btn.active-discuss {
    border-color: var(--amber);
    background: var(--amber-bg);
    color: var(--amber);
  }
  .note-textarea {
    width: 100%;
    min-height: 48px;
    max-height: 120px;
    border: 1px solid var(--gray-200);
    border-radius: 6px;
    padding: 6px 10px;
    font-size: 12px;
    font-family: inherit;
    resize: vertical;
    line-height: 1.5;
  }
  .note-textarea:focus {
    outline: none;
    border-color: var(--brand);
  }
  .decision-group {
    margin-bottom: 8px;
  }
  .decision-group-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .5px;
    color: var(--purple);
    margin-bottom: 6px;
  }
  .decision-option {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border: 1px solid var(--gray-200);
    border-radius: 6px;
    margin-bottom: 3px;
    cursor: pointer;
    transition: all .15s;
    font-size: 12px;
    color: var(--gray-600);
  }
  .decision-option:hover {
    border-color: var(--brand);
    background: var(--brand-light);
  }
  .decision-option.chosen {
    border-color: var(--brand);
    background: var(--brand-light);
    color: var(--brand);
  }
  .decision-radio {
    width: 14px;
    height: 14px;
    border: 2px solid var(--gray-300);
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .decision-option.chosen .decision-radio {
    border-color: var(--brand);
  }
  .decision-option.chosen .decision-radio::after {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--brand);
  }
  .decision-rec {
    font-size: 9px;
    color: var(--green);
    font-weight: 700;
    text-transform: uppercase;
    margin-left: 4px;
  }
</style>
