<script>
  const { schema, dynamicComponent: DynComp, activeTraceId = '' } = $props();

  const statusHeaderClass = {
    new: 'sth-new',
    mod: 'sth-mod',
    del: 'sth-del',
  };

  const statusBadgeLabel = {
    new: 'New Table',
    mod: 'Modified',
    del: 'Removed',
  };

  function fieldClass(status) {
    if (status === 'new') return 'sf-new';
    if (status === 'join') return 'sf-join';
    if (status === 'drop') return 'sf-drop';
    return '';
  }
</script>

<div class="panel schema-card" id={schema.id}>
  <!-- Header -->
  <div class="schema-table-header {statusHeaderClass[schema.status] ?? ''}">
    <span class="table-name">{schema.table}</span>
    <span class="sh-badge">{statusBadgeLabel[schema.status] ?? schema.status}</span>
  </div>

  <!-- 3-column body -->
  <div class="schema-card-body">
    <!-- Col 1: Database -->
    <div class="schema-col">
      <div class="schema-col-header">Database</div>
      {#each schema.sections ?? [] as section}
        <div class="sf-divider">{section.label}</div>
        {#each section.fields ?? [] as field}
          <div class="sf-row {fieldClass(field.status)}">
            <span class="sf-name">{field.name}</span>
            <span class="sf-type">{field.dbType ?? ''}</span>
            {#if field.note}
              <span class="sf-note">{field.note}</span>
            {/if}
          </div>
        {/each}
      {/each}
      {#if schema.indexes?.length}
        <div class="sf-divider">Indexes</div>
        {#each schema.indexes as idx}
          <div class="idx-row">
            <span class="idx-name">{idx.name}</span>
            <span class="idx-cols">{idx.cols}</span>
            {#if idx.note}
              <span class="idx-note">{idx.note}</span>
            {/if}
          </div>
        {/each}
      {/if}
    </div>

    <!-- Col 2: API Response Shape -->
    <div class="schema-col">
      <div class="schema-col-header">API Response Shape</div>
      {#each schema.sections ?? [] as section}
        <div class="sf-divider">{section.label}</div>
        {#each section.fields ?? [] as field}
          <div class="sf-row {fieldClass(field.status)}">
            <span class="sf-name">{field.name}</span>
            <span class="sf-type">{field.apiType ?? field.dbType ?? ''}</span>
          </div>
        {/each}
      {/each}
      {#if schema.joins?.length}
        <div class="sf-divider">Joined Fields</div>
        {#each schema.joins as join}
          <div class="sf-row sf-join">
            <span class="sf-name">{join.name}</span>
            <span class="sf-type">{join.type}</span>
            {#if join.from}
              <span class="sf-note">&larr; {join.from}</span>
            {/if}
          </div>
        {/each}
      {/if}
    </div>

    <!-- Col 3: SQL Query (dynamic code) -->
    <div class="schema-col ep-card-code">
      <div class="schema-col-header sch-dark">SQL Query</div>
      {#if DynComp}
        <div class="cb-body">
          <DynComp {activeTraceId} />
        </div>
      {:else}
        <div class="no-code">No code file specified</div>
      {/if}
    </div>
  </div>
</div>

<style>
  .panel {
    border: 1px solid var(--gray-200);
    border-radius: 8px;
    overflow: hidden;
    background: white;
    margin-bottom: 16px;
  }

  .schema-table-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 14px;
    background: var(--gray-800);
    border-bottom: 1px solid var(--gray-200);
  }
  .schema-table-header.sth-new { background: var(--green-bg); }
  .schema-table-header.sth-new .table-name { color: var(--green); }
  .schema-table-header.sth-new .sh-badge { background: var(--green); color: white; }
  .schema-table-header.sth-mod { background: var(--amber-bg); }
  .schema-table-header.sth-mod .table-name { color: var(--amber); }
  .schema-table-header.sth-mod .sh-badge { background: var(--amber); color: white; }
  .schema-table-header.sth-del { background: var(--red-bg); }
  .schema-table-header.sth-del .table-name { color: var(--red); }
  .schema-table-header.sth-del .sh-badge { background: var(--red); color: white; }

  .table-name {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 700;
    color: white;
  }

  .sh-badge {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 4px;
    letter-spacing: .5px;
  }

  .schema-card-body {
    display: grid;
    grid-template-columns: 1fr 1fr 1.3fr;
    gap: 0;
  }

  .schema-col {
    border-right: 1px solid var(--gray-200);
  }
  .schema-col:last-child {
    border-right: none;
  }

  .schema-col-header {
    padding: 4px 14px;
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .4px;
    color: var(--gray-500);
    background: var(--gray-200);
    border-bottom: 1px solid var(--gray-200);
  }
  .schema-col-header.sch-dark {
    background: var(--gray-800);
    color: var(--gray-400);
    border-bottom-color: #374151;
  }

  .sf-divider {
    padding: 5px 14px;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .5px;
    color: var(--gray-400);
    background: var(--gray-50);
    border-bottom: 1px solid var(--gray-100);
    border-top: 1px solid var(--gray-100);
  }

  .sf-row {
    display: flex;
    align-items: baseline;
    padding: 3px 14px;
    border-bottom: 1px solid var(--gray-50);
    font-size: 11px;
    gap: 6px;
  }
  .sf-row:last-child { border-bottom: none; }
  .sf-row:hover { background: var(--gray-50); }

  .sf-name {
    font-family: var(--font-mono);
    font-weight: 500;
    color: var(--gray-700);
    min-width: 140px;
    flex-shrink: 0;
  }
  .sf-type {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--gray-400);
    min-width: 80px;
    flex-shrink: 0;
  }
  .sf-note {
    font-size: 10px;
    color: var(--gray-400);
    font-style: italic;
    flex: 1;
  }

  .sf-row.sf-new { background: var(--green-bg); }
  .sf-row.sf-new .sf-name { color: var(--green); font-weight: 600; }
  .sf-row.sf-new .sf-note { color: var(--green); font-style: normal; }
  .sf-row.sf-join { background: var(--purple-bg); }
  .sf-row.sf-join .sf-name { color: var(--purple); font-weight: 600; }
  .sf-row.sf-join .sf-note { color: var(--purple); font-style: normal; }
  .sf-row.sf-drop { background: var(--red-bg); }
  .sf-row.sf-drop .sf-name { text-decoration: line-through; color: var(--red); }
  .sf-row.sf-drop .sf-note { color: var(--red); font-style: normal; }

  .idx-row {
    display: flex;
    padding: 4px 14px;
    font-size: 10px;
    gap: 8px;
    border-bottom: 1px solid var(--gray-50);
    font-family: var(--font-mono);
    background: var(--blue-bg);
  }
  .idx-name { color: var(--blue); min-width: 160px; font-weight: 600; }
  .idx-cols { color: var(--gray-700); }
  .idx-note {
    color: var(--gray-400);
    font-family: var(--font-sans);
    font-style: italic;
    margin-left: auto;
  }

  .ep-card-code {
    background: var(--gray-900);
    display: flex;
    flex-direction: column;
  }

  .cb-body {
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 1.7;
    padding: 8px 0;
    flex: 1;
    overflow-y: auto;
  }

  .no-code {
    padding: 20px 14px;
    color: var(--gray-500);
    font-size: 11px;
  }
</style>
