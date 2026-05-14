/**
 * Escape a string for YAML if it contains special characters.
 * Returns the string wrapped in double quotes with internal quotes escaped,
 * or the plain string if safe.
 */
function yamlEscape(str) {
  if (!str) return '""';
  if (/[:#\[\]{}&*!|>'"%@`,\n\r]/.test(str) || str.trim() !== str) {
    return '"' + String(str).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
  }
  return str;
}

/**
 * Generate YAML export from risk review state.
 *
 * @param {Array}    findings          - All finding objects from config
 * @param {Object}   statuses          - { [findingId]: 'ignore'|'acceptfix'|'discuss'|'' }
 * @param {Object}   notes             - { [findingId]: string }
 * @param {Object}   decisions         - { [findingId]: optionId }
 * @param {Object}   decisionOptionsMap - { [findingId]: [{id, label, recommended?}] }
 * @param {Function} getMitigation     - (findingId) => string
 * @returns {string} YAML string
 */
export function generateYAML(findings, statuses, notes, decisions, decisionOptionsMap, getMitigation) {
  const groups = {
    decisions:  [],
    acceptfix:  [],
    ignore:     [],
    discuss:    [],
    unreviewed: [],
  };

  for (const f of findings) {
    const status   = statuses[f.id]   || '';
    const note     = notes[f.id]      || '';
    const decision = decisions[f.id]  || '';

    const entry = { finding: f, status, note, decision };

    if (f.severity === 'open' && (decision || status)) {
      groups.decisions.push(entry);
    } else if (status === 'acceptfix') {
      groups.acceptfix.push(entry);
    } else if (status === 'ignore') {
      groups.ignore.push(entry);
    } else if (status === 'discuss') {
      groups.discuss.push(entry);
    } else if (!status && !note && !decision) {
      groups.unreviewed.push(entry);
    } else {
      // Has note but no status
      groups.discuss.push(entry);
    }
  }

  const lines = [];
  lines.push('---');
  lines.push('title: Risk Review Export');
  lines.push('---');
  lines.push('');

  function renderEntry(entry, extra = {}) {
    const parts = [`  - finding: ${yamlEscape(entry.finding.name)}`];
    if (extra.decision) parts.push(`    selected: ${yamlEscape(extra.decision)}`);
    if (extra.mitigation) parts.push(`    mitigation: ${yamlEscape(extra.mitigation)}`);
    if (entry.status) parts.push(`    status: ${entry.status}`);
    if (entry.note) parts.push(`    notes: ${yamlEscape(entry.note)}`);
    return parts.join('\n');
  }

  if (groups.decisions.length > 0) {
    lines.push('decisions:');
    for (const e of groups.decisions) {
      const opts = decisionOptionsMap[e.finding.id] || [];
      const chosen = opts.find(o => o.id === e.decision);
      const selectedLabel = chosen ? `${chosen.id}: ${chosen.label}` : e.decision;
      lines.push(renderEntry(e, { decision: selectedLabel || '' }));
    }
    lines.push('');
  }

  if (groups.acceptfix.length > 0) {
    lines.push('acceptfix:');
    for (const e of groups.acceptfix) {
      const mit = getMitigation(e.finding.id);
      lines.push(renderEntry(e, { mitigation: mit }));
    }
    lines.push('');
  }

  if (groups.ignore.length > 0) {
    lines.push('ignore:');
    for (const e of groups.ignore) {
      lines.push(renderEntry(e));
    }
    lines.push('');
  }

  if (groups.discuss.length > 0) {
    lines.push('discuss:');
    for (const e of groups.discuss) {
      lines.push(renderEntry(e));
    }
    lines.push('');
  }

  if (groups.unreviewed.length > 0) {
    lines.push('unreviewed:');
    for (const e of groups.unreviewed) {
      lines.push(`  - finding: ${yamlEscape(e.finding.name)}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
