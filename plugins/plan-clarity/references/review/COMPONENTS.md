# Dynamic Component Reference

Components for writing `dynamic/<type>/*.svelte` files in hybrid facets (logic, data, layout). Import paths are relative from `dynamic/<type>/` to `../src/`.

## Code Components

Used by **logic** and **data** facets for annotated code diffs.

### CodePanel

Pass-through wrapper for code diff content. File tab switching is handled by the parent app component (LogicApp/DataApp), so CodePanel simply renders its children.

```svelte
<script>
  import CodePanel from '../../src/code/CodePanel.svelte';
</script>

<CodePanel files={[{id: 'route-ts', label: 'story/route.ts'}]} {activeTraceId}>
  <!-- CodeSections go here -->
</CodePanel>
```

| Prop | Type | Description |
|------|------|-------------|
| `files` | `{id: string, label: string}[]` | Accepted for compatibility but not rendered — tabs are managed by the parent app |
| `activeTraceId` | `string` | Currently selected trace node ID (passed through to children) |

### CodeSection

Groups lines that belong together. Glows with a cyan border when `activeTraceId` matches any entry in `traceIds`.

```svelte
<CodeSection file="route-ts" traceIds={["step-1", "step-1-e1"]} {activeTraceId}>
  <Line type="existing">  existing code</Line>
  <Line type="new">  new code</Line>
</CodeSection>
```

| Prop | Type | Description |
|------|------|-------------|
| `file` | `string` | Must match a `files[].id` from the parent CodePanel |
| `traceIds` | `string[]` | Trace node IDs that activate this section's glow |
| `activeTraceId` | `string` | Pass through from parent |

### Line

Single code line. The `type` controls background color and left border.

| Type | Appearance |
|------|------------|
| `existing` | Gray text, no highlight — context lines |
| `new` | Green left border, green tint — added code |
| `edit` | Amber left border, amber tint — modified code |
| `del` | Red left border, red tint, strikethrough — removed code |
| `dim` | Darker gray — less important context |

Use leading spaces for indentation inside `<Line>` tags. The build system preserves them automatically for all files under `dynamic/`.

```svelte
<Line type="new">  <Kw>const</Kw> <Op>x</Op> = <Fn>parse</Fn>(<Op>body</Op>);</Line>
```

### Gap

Visual `···` separator between non-contiguous code sections. No props.

```svelte
<Gap />
```

### Annotation

Blue explanation block between code sections. Takes children as content.

```svelte
<Annotation>Insert new row, handle unique constraint</Annotation>
```

### Syntax Token Wrappers

Inline `<span>` wrappers for syntax highlighting inside `<Line>`.

| Component | Color | Use for |
|-----------|-------|---------|
| `Kw` | Purple (#c084fc) | Keywords: `const`, `await`, `if`, `return`, `export`, `function` |
| `Fn` | Cyan (#67e8f9) | Function/type names: `NextResponse.json`, `prisma.$queryRaw` |
| `Str` | Green (#86efac) | Strings and template literals |
| `Cm` | Gray italic (#6b7280) | Comments |
| `Op` | Yellow (#fbbf24) | Operators and variables: `body`, `result`, `status` |

### Import Block

Every dynamic file for logic/data should start with this block:

```svelte
<script>
  import CodePanel from '../../src/code/CodePanel.svelte';
  import CodeSection from '../../src/code/CodeSection.svelte';
  import Line from '../../src/code/Line.svelte';
  import Gap from '../../src/code/Gap.svelte';
  import Annotation from '../../src/code/Annotation.svelte';
  import Kw from '../../src/code/Kw.svelte';
  import Fn from '../../src/code/Fn.svelte';
  import Str from '../../src/code/Str.svelte';
  import Cm from '../../src/code/Cm.svelte';
  import Op from '../../src/code/Op.svelte';

  const { activeTraceId = '' } = $props();
</script>
```

## Layout Components

Used by the **layout** facet for UI mockups.

### Mockup CSS Classes

Layout mockups are plain HTML styled with these classes (no component imports needed):

| Class | Purpose |
|-------|---------|
| `mock-section` | Container for a UI region |
| `mock-section mock-new` | New section (green dashed border) |
| `mock-section mock-removed` | Removed section (red border, faded, strikethrough) |
| `mock-section-header` | Section label (uppercase, small text) |
| `mock-card` | Individual card or list item |
| `mock-card mock-frozen` | Read-only/disabled card |
| `mock-btn` | Button element |
| `mock-empty` | Placeholder for absent UI |
| `mock-field-label` | Field label (uppercase, 7px) |
| `mock-field-value` | Field value (8px) |
| `mock-row` | Flex row for inline items |
| `mock-badge` | Small status badge |
| `mock-textarea` | Text area placeholder |
| `mock-input-row` | Row of input fields |
| `mock-input` | Text input placeholder |
| `mock-send` | Send/submit button |
| `mock-removed-label` | Red removal label |

Utility classes: `text-muted`, `text-center`, `text-7`, `text-8`, `text-9`, `mt-2`, `mt-3`, `mt-4`.

### Arrow Target Attributes

Mockup elements that are arrow targets must have a data attribute matching the `to` value in the arrow config:

- **Proposed UI mockups**: `data-arrow-point="targetId"`
- **Current UI mockups**: `data-arrow-point-cur="targetId"`

Validation scans all `dynamic/**/*.svelte` files to verify every arrow target exists.

### Layout Mockup Example

```svelte
<!-- dynamic/layout/mockup-dashboard-proposed.svelte -->
<div class="mock-section mock-new" data-arrow-point="storyList">
  <div class="mock-section-header">Tech Stories</div>
  <div class="mock-card">Story 1: Replaced brake pads...</div>
  <div class="mock-card">Story 2: Checked alignment...</div>
  <div class="mock-btn" data-arrow-point="saveBtn">Save Draft</div>
</div>

<div class="mock-section mock-removed">
  <div class="mock-section-header">Legacy Notes</div>
  <div class="mock-card">Free-text notes field</div>
</div>
```

## Code Diff Rules

1. **Context is mandatory**: 2–4 lines of `existing` code above/below changes. Never show only new lines.
2. **Show real code**: the actual TypeScript/SQL.
3. **Use Gap for skipped sections**: `<Gap />` between non-contiguous code regions.
4. **Full-file diffs**: The code panel shows the complete file as a continuous scroll. Clicking a trace node highlights the relevant CodeSection.
5. **Granular sections**: Split large blocks into granular CodeSections so edge cases highlight only their relevant lines.
6. **Tabbed panels**: Use the `files` prop on CodePanel when changes touch multiple files. Tab labels should be short file paths.
7. **Escape curly braces**: Svelte treats `{` as expression start. Literal curly braces in displayed code MUST be escaped as `{'{'}`  and `{'}'}`. Example: `<Line type="existing">  {'{'} <Cm>// block</Cm></Line>`. This applies to JS object literals, function bodies, destructuring, etc. Forgetting this causes a Svelte parse error at build time.

## Markdown in Config Text Fields

All text fields in YAML configs (`summary`, `context`, `description`, `body`, `answer`, etc.) are rendered through a lightweight markdown parser. Supported syntax:

- `**bold**` → **bold**
- `` `inline code` `` → `code`
- Fenced code blocks (triple backtick with optional language)
- `- list items` (unordered lists)
- Paragraphs separated by blank lines

Write config text using markdown formatting. Do not embed raw HTML.

## File Organization

Each facet writes dynamic files to its own subdirectory:
- Logic: `dynamic/logic/<fileId>.svelte`
- Data: `dynamic/data/<fileId>.svelte`
- Layout: `dynamic/layout/<fileId>.svelte`

The `codeFiles` and `codeFile` fields in config reference just the `fileId` (without path or extension). The app resolves files by matching the filename across all subdirectories.
