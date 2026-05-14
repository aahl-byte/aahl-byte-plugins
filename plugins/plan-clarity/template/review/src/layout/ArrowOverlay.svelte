<script>
  const { arrows, activeTab, containerRef } = $props();

  const arrowColors = ['#0891b2', '#7c3aed', '#e11d48', '#d97706', '#15803d', '#6366f1'];
  const attrNames = ['data-cur-field', 'data-new-field', 'data-arrow-point-cur', 'data-arrow-point'];

  let svgEl = $state(null);

  function initMarkers() {
    if (!svgEl) return;
    const defs = svgEl.querySelector('defs');
    if (!defs) return;
    defs.innerHTML = '';
    arrowColors.forEach((color, i) => {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', `ah-${i}`);
      marker.setAttribute('markerWidth', '7');
      marker.setAttribute('markerHeight', '5');
      marker.setAttribute('refX', '3');
      marker.setAttribute('refY', '2.5');
      marker.setAttribute('orient', 'auto');
      marker.setAttribute('overflow', 'visible');
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', '0,0 7,2.5 0,5');
      poly.setAttribute('fill', color);
      marker.appendChild(poly);
      defs.appendChild(marker);
    });
  }

  function findElement(id) {
    if (!containerRef) return null;
    for (const attr of attrNames) {
      const el = containerRef.querySelector(`[${attr}="${id}"]`);
      if (el) return { el, attr };
    }
    return null;
  }

  function drawArrows() {
    if (!svgEl || !containerRef) return;

    // Remove old paths
    svgEl.querySelectorAll('path.arrow-path').forEach(p => p.remove());

    const cRect = containerRef.getBoundingClientRect();
    let colorIdx = 0;

    const visible = arrows.filter(a => a.tab === activeTab);

    visible.forEach(conn => {
      const fromResult = findElement(conn.from);
      const toResult = findElement(conn.to);
      if (!fromResult || !toResult) return;
      if (fromResult.el.offsetParent === null || toResult.el.offsetParent === null) return;

      const fRect = fromResult.el.getBoundingClientRect();
      const tRect = toResult.el.getBoundingClientRect();
      const markerId = `ah-${colorIdx % arrowColors.length}`;
      const color = arrowColors[colorIdx % arrowColors.length];
      colorIdx++;

      const fy = fRect.top - cRect.top + fRect.height / 2;
      const ty = tRect.top - cRect.top + tRect.height / 2;
      let x1, y1, x2, y2;

      if (conn.side === 'proposed') {
        x1 = fRect.right - cRect.left;
        y1 = fy;
        x2 = tRect.left - cRect.left - 4;
        y2 = ty;
      } else {
        x1 = fRect.left - cRect.left;
        y1 = fy;
        x2 = tRect.right - cRect.left + 4;
        y2 = ty;
      }

      const midX = (x1 + x2) / 2;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`);
      path.setAttribute('marker-end', `url(#${markerId})`);
      path.setAttribute('stroke', color);
      path.classList.add('arrow-path');
      path.dataset.arrowFrom = conn.from;
      path.dataset.arrowTo = conn.to;
      svgEl.appendChild(path);
    });
  }

  // Handle hover on store rows to highlight matching arrows
  function handleMouseOver(e) {
    const row = e.target.closest('[data-new-field], [data-cur-field]');
    if (!row || !svgEl) return;
    const field = row.dataset.newField || row.dataset.curField;
    svgEl.querySelectorAll('.arrow-path').forEach(p =>
      p.classList.toggle('highlighted', p.dataset.arrowFrom === field || p.dataset.arrowTo === field)
    );
  }

  function handleMouseOut(e) {
    if (e.target.closest('[data-new-field], [data-cur-field]') && svgEl) {
      svgEl.querySelectorAll('.arrow-path.highlighted').forEach(p => p.classList.remove('highlighted'));
    }
  }

  // Initialize markers on mount, redraw arrows on tab change
  $effect(() => {
    if (svgEl) {
      initMarkers();
    }
  });

  // Redraw whenever activeTab changes or containerRef becomes available
  $effect(() => {
    // Touch reactive deps
    void activeTab;
    void containerRef;
    if (svgEl && containerRef) {
      requestAnimationFrame(drawArrows);
    }
  });

  // ResizeObserver for container resizes
  $effect(() => {
    if (!containerRef) return;
    let timer;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(drawArrows, 30);
    });
    ro.observe(containerRef);
    return () => ro.disconnect();
  });

  // Global hover listeners
  $effect(() => {
    if (!containerRef) return;
    containerRef.addEventListener('mouseover', handleMouseOver);
    containerRef.addEventListener('mouseout', handleMouseOut);
    return () => {
      containerRef.removeEventListener('mouseover', handleMouseOver);
      containerRef.removeEventListener('mouseout', handleMouseOut);
    };
  });
</script>

<svg class="arrow-overlay" bind:this={svgEl} overflow="visible">
  <defs></defs>
</svg>

<style>
  .arrow-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 20;
  }
  .arrow-overlay :global(path) {
    fill: none;
    stroke-width: 1.5;
    opacity: .6;
    transition: stroke-width .2s, opacity .2s;
  }
  .arrow-overlay :global(path.highlighted) {
    stroke-width: 2.5;
    opacity: 1;
  }
</style>
