<script>
  import TopBar from '../shared/TopBar.svelte';
  import TOC from '../shared/TOC.svelte';
  import Tabs from '../shared/Tabs.svelte';
  import QAPanel from './QAPanel.svelte';
  import TraceNode from './TraceNode.svelte';

  const { config } = $props();

  // Dynamic code file imports (recursive to support per-facet subdirectories)
  const dynamicModules = import.meta.glob('/dynamic/**/*.svelte', { eager: true });

  function getDynamicComponent(fileId) {
    const match = Object.entries(dynamicModules).find(([path]) =>
      path.endsWith(`/${fileId}.svelte`)
    );
    return match?.[1]?.default ?? null;
  }

  // State
  let activeViewId = $state(config.routes?.[0]?.id ?? '');
  let activeTraceId = $state('');

  // Per-route active file tab tracking
  let activeFileTabs = $state({});

  function getActiveFileTab(viewId, codeFiles) {
    return activeFileTabs[viewId] ?? codeFiles?.[0] ?? '';
  }

  function setActiveFileTab(viewId, fileId) {
    activeFileTabs[viewId] = fileId;
  }

  // Lifecycle toggle state (per lifecycle view)
  let lcApproach = $state({});

  function getLcApproach(lcId) {
    return lcApproach[lcId] ?? 'timeline';
  }

  function setLcApproach(lcId, approach) {
    lcApproach[lcId] = approach;
  }

  // Status color helper
  function statusColor(status) {
    if (status === 'new') return 'var(--green)';
    if (status === 'del') return 'var(--red)';
    return 'var(--amber)';
  }

  // TOC sections
  const tocSections = $derived(() => {
    const sections = [
      {
        heading: 'Routes',
        items: (config.routes ?? []).map(r => ({
          id: r.id,
          label: r.path,
          prefix: r.method,
          prefixColor: statusColor(r.status),
          badge: {
            label: r.status === 'new' ? 'new' : r.status === 'del' ? 'del' : 'mod',
            variant: r.status === 'new' ? 'new' : r.status === 'del' ? 'del' : 'mod'
          }
        }))
      }
    ];
    if (config.lifecycles?.length) {
      sections.push({
        heading: 'Lifecycles',
        items: config.lifecycles.map(lc => ({
          id: lc.id,
          label: lc.entity
        }))
      });
    }
    return sections;
  });

  // Find a route by id
  function findRoute(id) {
    return config.routes?.find(r => r.id === id);
  }

  // Find a lifecycle by id
  function findLifecycle(id) {
    return config.lifecycles?.find(lc => lc.id === id);
  }

  // Handle trace node selection
  function handleTraceSelect(traceId) {
    activeTraceId = traceId;
    // Auto-switch to the correct file tab if the code section is in a different file
    // This is handled by the dynamic components themselves via activeTraceId prop
  }

  // Handle Q&A "Show in trace" link
  function handleTraceFromQA(traceId) {
    activeTraceId = traceId;
    // Scroll to the trace node
    requestAnimationFrame(() => {
      const el = document.querySelector(`.trace-node[data-trace="${traceId}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  // Resize handle logic
  let qaWidths = $state({});

  function getQaWidth(viewId) {
    return qaWidths[viewId] ?? 340;
  }

  function handleResizeStart(e, viewId) {
    e.preventDefault();
    const tocEl = document.querySelector('.toc');
    const tocWidth = tocEl ? tocEl.getBoundingClientRect().width : 0;

    const onMove = (ev) => {
      qaWidths[viewId] = Math.min(600, Math.max(180, ev.clientX - tocWidth));
    };
    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

</script>

<div class="app">
  <TopBar
    title={config.title}
    tags={[{
      label: `${config.routes?.length ?? 0} routes`,
      variant: 'default'
    }]}
  />

  <div class="main-layout">
    <TOC
      sections={tocSections()}
      activeId={activeViewId}
      onselect={(id) => { activeViewId = id; activeTraceId = ''; }}
    />

    <!-- Route Views -->
    {#each config.routes ?? [] as route}
      <div class="route-view" class:active={activeViewId === route.id}>
        <!-- Q&A Column -->
        <div style="width: {getQaWidth(route.id)}px; min-width: 180px; flex-shrink: 0;">
          <QAPanel
            items={route.qa ?? []}
            ontraceselect={handleTraceFromQA}
          />
        </div>

        <!-- Resize Handle -->
        <div
          class="resize-handle"
          role="separator"
          aria-orientation="vertical"
          onmousedown={(e) => handleResizeStart(e, route.id)}
        ></div>

        <!-- Trace Column -->
        <div class="col-trace">
          <div class="col-header trace-header">Trace</div>
          <div class="trace">
            {#each route.trace ?? [] as traceGroup}
              <div class="trace-group tg-{traceGroup.group || 'default'}">
                {traceGroup.group !== 'default' ? (traceGroup.group ?? '').toUpperCase() : ''}
              </div>
              {#each traceGroup.nodes ?? [] as node}
                <TraceNode
                  {node}
                  group={traceGroup.group || 'default'}
                  {activeTraceId}
                  onselect={handleTraceSelect}
                />
              {/each}
            {/each}
          </div>
        </div>

        <!-- Code Column -->
        <div class="col-code">
          {#if route.codeFiles?.length}
            <Tabs
              tabs={route.codeFiles.map(f => ({ id: f, label: f }))}
              activeId={getActiveFileTab(route.id, route.codeFiles)}
              variant="dark"
              onselect={(id) => setActiveFileTab(route.id, id)}
            />
          {/if}
          <div class="cb-body">
            {#each route.codeFiles ?? [] as fileId}
              {@const Comp = getDynamicComponent(fileId)}
              <div class="code-tab-body" class:active={getActiveFileTab(route.id, route.codeFiles) === fileId}>
                {#if Comp}
                  <Comp {activeTraceId} />
                {:else}
                  <div class="no-code">No code file: {fileId}.svelte</div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/each}

    <!-- Lifecycle Views -->
    {#each config.lifecycles ?? [] as lc}
      <div class="route-view" class:active={activeViewId === lc.id}>
        <!-- Q&A Column -->
        <div style="width: {getQaWidth(lc.id)}px; min-width: 180px; flex-shrink: 0;">
          <QAPanel
            items={lc.qa ?? []}
            ontraceselect={handleTraceFromQA}
          />
        </div>

        <!-- Resize Handle -->
        <div
          class="resize-handle"
          role="separator"
          aria-orientation="vertical"
          onmousedown={(e) => handleResizeStart(e, lc.id)}
        ></div>

        <!-- Trace Column (with timeline/route group toggle) -->
        <div class="col-trace">
          <div class="col-header trace-header">Trace</div>
          <div class="lc-toggle">
            <button
              class="lc-toggle-btn"
              class:active={getLcApproach(lc.id) === 'timeline'}
              onclick={() => setLcApproach(lc.id, 'timeline')}
            >Entity Timeline</button>
            <button
              class="lc-toggle-btn"
              class:active={getLcApproach(lc.id) === 'routes'}
              onclick={() => setLcApproach(lc.id, 'routes')}
            >Route Groups</button>
          </div>

          <!-- Entity Timeline approach -->
          <div class="lc-approach" class:active={getLcApproach(lc.id) === 'timeline'}>
            <div class="trace">
              {#each lc.states ?? [] as state, i}
                <div
                  class="trace-state-node"
                  class:selected={activeTraceId === state.id}
                  role="button"
                  tabindex="0"
                  data-trace={state.id}
                  onclick={() => handleTraceSelect(state.id)}
                  onkeydown={(e) => e.key === 'Enter' && handleTraceSelect(state.id)}
                >
                  <div class="trace-state-pip">
                    <div class="trace-state-dot"></div>
                    {#if i < (lc.states?.length ?? 0) - 1}
                      <div class="trace-state-line"></div>
                    {/if}
                  </div>
                  <div class="trace-state-content">
                    <div class="trace-state-label">{state.from} &rarr; {state.to}</div>
                    <div class="trace-state-trigger">{state.trigger}</div>
                    {#if state.desc}
                      <div class="trace-state-desc">{state.desc}</div>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </div>

          <!-- Route Groups approach -->
          <div class="lc-approach" class:active={getLcApproach(lc.id) === 'routes'}>
            <div class="trace">
              {#each lc.routes ?? [] as routeId}
                {@const route = findRoute(routeId)}
                {#if route}
                  <div class="trace-group tg-default">{route.method} {route.path}</div>
                  {#each route.trace ?? [] as traceGroup}
                    {#each traceGroup.nodes ?? [] as node}
                      <TraceNode
                        {node}
                        group={traceGroup.group || 'default'}
                        {activeTraceId}
                        onselect={handleTraceSelect}
                      />
                    {/each}
                  {/each}
                {/if}
              {/each}
            </div>
          </div>
        </div>

        <!-- Code Column -->
        <div class="col-code">
          {#if lc.codeFiles?.length}
            <Tabs
              tabs={lc.codeFiles.map(f => ({ id: f, label: f }))}
              activeId={getActiveFileTab(lc.id, lc.codeFiles)}
              variant="dark"
              onselect={(id) => setActiveFileTab(lc.id, id)}
            />
          {/if}
          <div class="cb-body">
            {#each lc.codeFiles ?? [] as fileId}
              {@const Comp = getDynamicComponent(fileId)}
              <div class="code-tab-body" class:active={getActiveFileTab(lc.id, lc.codeFiles) === fileId}>
                {#if Comp}
                  <Comp {activeTraceId} />
                {:else}
                  <div class="no-code">No code file: {fileId}.svelte</div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }
  .main-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  /* Route views — shown/hidden by TOC */
  .route-view {
    display: none;
    flex: 1;
    overflow: hidden;
  }
  .route-view.active { display: flex; }

  /* Resize handle */
  .resize-handle {
    width: 5px;
    cursor: col-resize;
    background: var(--gray-200);
    flex-shrink: 0;
    transition: background .15s;
    position: relative;
  }
  .resize-handle:hover { background: var(--brand); }
  .resize-handle::after {
    content: '';
    position: absolute;
    top: 50%;
    left: -3px;
    transform: translateY(-50%);
    width: 11px;
    height: 32px;
    cursor: col-resize;
  }

  /* Trace column */
  .col-trace {
    background: var(--gray-50);
    border-right: 1px solid var(--gray-200);
    overflow-y: auto;
    flex-shrink: 0;
    width: 230px;
    display: flex;
    flex-direction: column;
  }

  /* Column headers */
  .col-header {
    position: sticky;
    top: 0;
    z-index: 10;
    padding: 8px 14px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .5px;
    border-bottom: 1px solid var(--gray-200);
  }
  .trace-header {
    background: var(--gray-100);
    color: var(--gray-500);
  }

  .trace {
    padding: 10px 8px;
    overflow-y: auto;
    flex: 1;
  }

  .trace-group {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .5px;
    padding: 8px 8px 4px;
    margin-top: 4px;
    border-top: 1px solid var(--gray-200);
  }
  .trace-group:first-child { border-top: none; margin-top: 0; }
  .tg-default { color: var(--gray-500); }
  .tg-error { color: var(--red); }
  .tg-state { color: var(--blue); }
  .tg-auth { color: var(--purple); }

  /* Code column */
  .col-code {
    background: var(--gray-900);
    overflow-y: auto;
    flex: 1;
    min-width: 300px;
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
  .code-tab-body {
    display: none;
  }
  .code-tab-body.active {
    display: block;
  }
  .no-code {
    padding: 30px 20px;
    text-align: center;
    color: var(--gray-500);
    font-size: 12px;
  }

  /* Lifecycle toggle */
  .lc-toggle {
    display: flex;
    gap: 2px;
    padding: 6px 8px;
    background: var(--gray-100);
    border-bottom: 1px solid var(--gray-200);
    flex-shrink: 0;
  }
  .lc-toggle-btn {
    padding: 4px 12px;
    font-size: 10px;
    font-weight: 600;
    color: var(--gray-500);
    cursor: pointer;
    border: none;
    background: none;
    border-radius: 4px;
    transition: all .1s;
    font-family: inherit;
  }
  .lc-toggle-btn:hover {
    color: var(--gray-700);
    background: var(--gray-200);
  }
  .lc-toggle-btn.active {
    color: white;
    background: var(--brand);
  }
  .lc-approach {
    display: none;
    flex: 1;
    overflow: hidden;
  }
  .lc-approach.active {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  /* Entity timeline state nodes */
  .trace-state-node {
    display: flex;
    gap: 8px;
    align-items: stretch;
    cursor: pointer;
    border-radius: 6px;
    padding: 6px 4px;
    margin: 0 -4px;
    transition: background .1s;
  }
  .trace-state-node:hover { background: rgba(0,0,0,.03); }
  .trace-state-pip {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    width: 28px;
  }
  .trace-state-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid var(--blue);
    background: white;
    flex-shrink: 0;
  }
  .trace-state-line {
    flex: 1;
    width: 2px;
    background: var(--gray-300);
    margin: 2px 0;
  }
  .trace-state-content {
    flex: 1;
    padding: 0 4px 8px;
  }
  .trace-state-label {
    font-weight: 700;
    font-size: 11px;
    color: var(--blue);
    line-height: 1.3;
  }
  .trace-state-trigger {
    font-size: 9px;
    color: var(--gray-500);
    margin-top: 2px;
    font-family: var(--font-mono);
  }
  .trace-state-desc {
    font-size: 9px;
    color: var(--gray-400);
    margin-top: 2px;
    line-height: 1.3;
  }
  .trace-state-node.selected { background: var(--blue-bg); }
  .trace-state-node.selected .trace-state-dot {
    background: var(--blue);
    box-shadow: 0 0 0 3px rgba(0,0,0,.08);
  }
</style>
