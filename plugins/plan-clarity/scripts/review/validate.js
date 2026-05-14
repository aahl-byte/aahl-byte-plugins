#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, relative, sep } from 'path';
import yaml from 'js-yaml';
import { compile } from 'svelte/compiler';

const cwd = process.cwd();
const args = process.argv.slice(2);
const configFiles = args.length > 0
  ? args.filter(f => existsSync(join(cwd, f)))
  : readdirSync(cwd).filter(f => f.endsWith('.config.yaml'));

if (args.length > 0 && configFiles.length !== args.length) {
  const missing = args.filter(f => !existsSync(join(cwd, f)));
  console.error(`validate: file(s) not found: ${missing.join(', ')}`);
  process.exit(1);
}

if (configFiles.length === 0) {
  console.error('validate: no *.config.yaml files found');
  process.exit(1);
}

let totalErrors = 0;
const referencedDynamicFiles = new Set();

const VALID_TYPES = ['execution', 'risk', 'logic', 'data', 'layout'];

function findSvelteFiles(dir) {
  if (!existsSync(dir)) return [];
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSvelteFiles(full));
    } else if (entry.name.endsWith('.svelte')) {
      results.push(full);
    }
  }
  return results;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const dynamicDir = join(cwd, 'dynamic');
const allDynamicFiles = findSvelteFiles(dynamicDir);
let allDynamicContent = null;
function getDynamicContent() {
  if (allDynamicContent === null) {
    allDynamicContent = allDynamicFiles.map(f => readFileSync(f, 'utf-8')).join('\n');
  }
  return allDynamicContent;
}

for (const file of configFiles) {
  const errors = [];
  const prefix = file.replace('.config.yaml', '');

  if (!VALID_TYPES.includes(prefix)) {
    errors.push(`Invalid config filename: "${file}" — prefix must be one of: ${VALID_TYPES.join(', ')}`);
  }

  let config;
  try {
    config = yaml.load(readFileSync(join(cwd, file), 'utf-8'));
  } catch (e) {
    errors.push(`Invalid YAML: ${e.reason || e.message}`);
    console.error(`validate [${file}]: ${errors.length} error(s):`);
    errors.forEach(e => console.error(`  - ${e}`));
    totalErrors += errors.length;
    continue;
  }

  if (!config || typeof config !== 'object') {
    errors.push('Config is empty or not a valid YAML object');
    console.error(`validate [${file}]: ${errors.length} error(s):`);
    errors.forEach(e => console.error(`  - ${e}`));
    totalErrors += errors.length;
    continue;
  }

  if (!config.type) errors.push('Missing required field: type');
  if (!config.title) errors.push('Missing required field: title');

  if (config.type && !VALID_TYPES.includes(config.type)) {
    errors.push(`Unknown type: ${config.type}`);
  }

  if (config.type && prefix && config.type !== prefix) {
    errors.push(`Type mismatch: file is "${file}" but type field is "${config.type}"`);
  }

  function checkFile(name) {
    const suffix = `${sep}${name}.svelte`;
    const match = allDynamicFiles.find(f => f.endsWith(suffix));
    if (match) {
      referencedDynamicFiles.add(match);
    } else {
      errors.push(`Dynamic file not found: ${name}.svelte (searched dynamic/**/)`);
    }
  }

  if (config.type === 'execution') {
    const allStepIds = new Set();
    const VALID_RISKS = ['migration', 'compat'];

    for (const phase of (config.phases || [])) {
      for (const step of (phase.steps || [])) {
        if (allStepIds.has(step.id)) errors.push(`Duplicate step ID: ${step.id}`);
        allStepIds.add(step.id);

        for (const risk of (step.risks || [])) {
          if (!VALID_RISKS.includes(risk)) errors.push(`Step ${step.id}: invalid risk "${risk}"`);
        }
      }
    }

    for (const phase of (config.phases || [])) {
      for (const step of (phase.steps || [])) {
        for (const dep of (step.deps || [])) {
          if (dep === step.id) {
            errors.push(`Step ${step.id}: cannot depend on itself`);
          } else if (!allStepIds.has(dep)) {
            errors.push(`Step ${step.id}: dep "${dep}" not found`);
          }
        }
      }
    }
  }

  if (config.type === 'risk') {
    const VALID_SEVERITIES = ['critical', 'warning', 'info', 'open'];
    const VALID_CATEGORIES = ['perm', 'perf', 'cross', 'migration', 'compat', 'decision', 'clarity'];
    const findingIds = new Set();

    for (const f of (config.findings || [])) {
      if (findingIds.has(f.id)) errors.push(`Duplicate finding ID: ${f.id}`);
      findingIds.add(f.id);

      if (!VALID_SEVERITIES.includes(f.severity)) errors.push(`Finding ${f.id}: invalid severity "${f.severity}"`);
      if (!VALID_CATEGORIES.includes(f.category)) errors.push(`Finding ${f.id}: invalid category "${f.category}"`);

      if (f.detail?.options && f.severity !== 'open') {
        errors.push(`Finding ${f.id}: options only allowed when severity is "open"`);
      }
      if (f.severity === 'open' && !f.detail?.options) {
        errors.push(`Finding ${f.id}: severity "open" requires options`);
      }
    }
  }

  if (config.type === 'logic') {
    const allRouteIds = new Set((config.routes || []).map(r => r.id));

    for (const route of (config.routes || [])) {
      const routeTraceIds = new Set();

      for (const grp of (route.trace || [])) {
        for (const node of (grp.nodes || [])) {
          if (routeTraceIds.has(node.id)) errors.push(`Route ${route.id}: duplicate trace ID "${node.id}"`);
          routeTraceIds.add(node.id);
          for (const edge of (node.edges || [])) {
            if (routeTraceIds.has(edge.id)) errors.push(`Route ${route.id}: duplicate trace ID "${edge.id}"`);
            routeTraceIds.add(edge.id);
          }
        }
      }

      for (const qa of (route.qa || [])) {
        if (qa.traceLink && !routeTraceIds.has(qa.traceLink)) {
          errors.push(`Route ${route.id}: traceLink "${qa.traceLink}" not found`);
        }
      }

      for (const f of (route.codeFiles || [])) checkFile(f);
    }

    for (const lc of (config.lifecycles || [])) {
      for (const rid of (lc.routes || [])) {
        if (!allRouteIds.has(rid)) errors.push(`Lifecycle ${lc.id}: route "${rid}" not found`);
      }
      for (const f of (lc.codeFiles || [])) checkFile(f);
    }
  }

  if (config.type === 'data') {
    const allIds = new Set();

    for (const s of (config.schemas || [])) {
      if (allIds.has(s.id)) errors.push(`Duplicate ID: ${s.id}`);
      allIds.add(s.id);
      if (s.codeFile) checkFile(s.codeFile);

      for (const sec of (s.sections || [])) {
        for (const f of (sec.fields || [])) {
          if (f.status && !['new', 'join', 'drop'].includes(f.status)) {
            errors.push(`Schema ${s.id}: invalid field status "${f.status}"`);
          }
        }
      }
    }

    for (const ep of (config.endpoints || [])) {
      if (allIds.has(ep.id)) errors.push(`Duplicate ID: ${ep.id} (shared namespace with schemas)`);
      allIds.add(ep.id);
      if (ep.codeFile) checkFile(ep.codeFile);
    }
  }

  if (config.type === 'layout') {
    const tabIds = new Set((config.tabs || []).map(t => t.id));
    const storeIds = new Set((config.stores || []).map(s => s.id));
    const fieldIds = new Set(
      (config.stores || []).flatMap(s => (s.sections || []).flatMap(sec => (sec.fields || []).map(f => f.id)))
    );

    for (const tab of (config.tabs || [])) {
      if (!storeIds.has(tab.primaryStore)) {
        errors.push(`Tab ${tab.id}: primaryStore "${tab.primaryStore}" not found`);
      }
    }

    for (const arrow of (config.arrows || [])) {
      if (!tabIds.has(arrow.tab)) errors.push(`Arrow tab "${arrow.tab}" not found`);

      if (!arrow.side || !['current', 'proposed'].includes(arrow.side)) {
        errors.push(`Arrow (from: ${arrow.from}): missing or invalid side (expected "current" or "proposed")`);
      }

      function checkEndpoint(id, label) {
        if (!fieldIds.has(id)) {
          if (allDynamicFiles.length === 0) {
            errors.push(`Arrow ${label} "${id}": not a store field and no .svelte files in dynamic/`);
            return;
          }
          const pattern = `data-arrow-point(?:-cur)?=["']${escapeRegex(id)}["']`;
          if (!new RegExp(pattern).test(getDynamicContent())) {
            errors.push(`Arrow ${label} "${id}": not a store field and not found as arrow target in dynamic/**/*.svelte`);
          }
        }
      }

      checkEndpoint(arrow.from, 'from');
      checkEndpoint(arrow.to, 'to');
    }

    for (const [tabId, mockup] of Object.entries(config.mockups || {})) {
      if (!tabIds.has(tabId)) errors.push(`Mockup key "${tabId}": tab not found`);
      if (mockup.current) checkFile(mockup.current);
      if (mockup.proposed) checkFile(mockup.proposed);
    }
  }

  if (errors.length > 0) {
    console.error(`validate [${file}]: ${errors.length} error(s):`);
    errors.forEach(e => console.error(`  - ${e}`));
    totalErrors += errors.length;
  } else {
    console.log(`validate [${file}]: OK`);
  }
}

// Determine which dynamic subdirectories are in scope (based on validated config types)
const validatedTypes = configFiles.map(f => f.replace('.config.yaml', ''));
const HYBRID_TYPES = ['logic', 'data', 'layout'];
const scopedDirs = validatedTypes.filter(t => HYBRID_TYPES.includes(t));

// Collect all Svelte files in the scoped subdirectories
const scopedFiles = new Set();
for (const type of scopedDirs) {
  const subdir = join(cwd, 'dynamic', type);
  for (const f of findSvelteFiles(subdir)) {
    scopedFiles.add(f);
  }
}

// Lint referenced files
let lintErrors = 0;
const svelteKeywords = new Set(['if', 'else', 'each', 'await', 'then', 'catch', 'key', 'html', 'render', 'snippet', 'const', 'debug']);

for (const filePath of referencedDynamicFiles) {
  const rel = relative(cwd, filePath);
  const source = readFileSync(filePath, 'utf-8');
  try {
    const result = compile(source, { generate: 'client' });
    for (const w of (result.warnings || [])) {
      console.warn(`lint [${rel}]: warning: ${w.message}`);
    }
  } catch (e) {
    const msg = e.message?.split('\n')[0] || e.code || 'unknown error';
    console.error(`lint [${rel}]: ${msg}`);
    lintErrors++;
  }

  const scriptMatch = source.match(/<script[^>]*>([\s\S]*?)<\/script>/);
  const scriptBody = scriptMatch?.[1] ?? '';
  const declared = new Set(scriptBody.match(/\b\w+\b/g) || []);
  const template = source
    .replace(/<script[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');
  let depth = 0;
  let inTag = false;
  let inAttrQuote = null;
  for (let i = 0; i < template.length; i++) {
    const ch = template[i];
    if (inTag) {
      if (inAttrQuote) {
        if (ch === inAttrQuote) inAttrQuote = null;
        continue;
      }
      if (ch === '"' || ch === "'") { inAttrQuote = ch; continue; }
      if (ch === '>') { inTag = false; continue; }
      continue;
    }
    if (ch === '<') { inTag = true; continue; }
    if (ch === '{') {
      if (depth === 0) {
        const rest = template.slice(i + 1);
        const identMatch = rest.match(/^\s*([a-zA-Z_]\w*)/);
        if (identMatch) {
          const ident = identMatch[1];
          if (!svelteKeywords.has(ident) && !declared.has(ident)) {
            const lineNum = template.slice(0, i).split('\n').length;
            console.error(`lint [${rel}]: line ~${lineNum}: probable unescaped brace — expression starts with undeclared identifier "${ident}"`);
            lintErrors++;
          }
        }
      }
      depth++;
    } else if (ch === '}') {
      depth = Math.max(0, depth - 1);
    }
  }
}

// Check for orphaned files (in scope but not referenced by any config)
const orphanedFiles = [...scopedFiles].filter(f => !referencedDynamicFiles.has(f));
for (const filePath of orphanedFiles) {
  console.error(`orphan [${relative(cwd, filePath)}]: not referenced by any validated config`);
}

totalErrors += lintErrors + orphanedFiles.length;

if (lintErrors > 0) {
  console.error(`\nlint: ${lintErrors} Svelte file(s) have errors`);
}
if (orphanedFiles.length > 0) {
  console.error(`orphan: ${orphanedFiles.length} unreferenced file(s)`);
}

if (totalErrors > 0) {
  console.error(`\nvalidate: ${totalErrors} total error(s)`);
  process.exit(1);
}

console.log(`validate: all ${configFiles.length} config(s) OK, ${referencedDynamicFiles.size} dynamic file(s) lint OK`);
