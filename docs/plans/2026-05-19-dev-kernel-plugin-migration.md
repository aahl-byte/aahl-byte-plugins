# dev-kernel + spec-management Plugin Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the standalone `ai-dev-kernel` repo into two Claude Code plugins (`spec-management` and `dev-kernel`) under `plugins/`.

**Architecture:** Two plugins with a filesystem boundary. `spec-management` is standalone (owns specs scaffolding, maintenance, tooling). `dev-kernel` depends on it at init time, reads `specs/` at runtime, never writes to it. Agent prompts are extracted from skill bodies into standalone `agents/*.md` files.

**Tech Stack:** Markdown (skills, agents, references), Python (validate.py, spec-tree.py), Node.js (ntfy.js), TypeScript (launch.ts), Bash (init.sh), YAML (plugin.json)

**Source repo:** `/Users/mr.leaf/git/ai-dev-kernel/`
**Target directory:** `/Users/mr.leaf/git/aahl-byte-plugins/plugins/`

---

### Task 1: Scaffold spec-management plugin

**Files:**
- Create: `plugins/spec-management/.claude-plugin/plugin.json`
- Create: `plugins/spec-management/skills/manage-specs/SKILL.md`
- Create: `plugins/spec-management/scripts/spec-tree.py`
- Create: `plugins/spec-management/templates/ARCHITECTURE.md`
- Create: `plugins/spec-management/templates/INTENT.md`

**Step 1: Create plugin.json**

```json
{
  "name": "spec-management",
  "description": "Living architecture documentation — audit, create, and maintain spec files with parent/child hierarchy, source tracking, and staleness detection.",
  "version": "1.0.0"
}
```

Write to: `plugins/spec-management/.claude-plugin/plugin.json`

**Step 2: Copy and adapt manage-specs skill**

Copy from: `/Users/mr.leaf/git/ai-dev-kernel/skills/manage-specs/SKILL.md`
Write to: `plugins/spec-management/skills/manage-specs/SKILL.md`

No path changes needed — manage-specs references `specs/` from the project root, not plugin-relative paths.

**Step 3: Copy spec-tree.py**

Copy from: `/Users/mr.leaf/git/ai-dev-kernel/scripts/spec-tree.py`
Write to: `plugins/spec-management/scripts/spec-tree.py`

No changes needed — it reads from `specs/` in the current directory.

**Step 4: Create scaffold templates**

Copy the scaffold content from `/Users/mr.leaf/git/ai-dev-kernel/init.sh` (lines 78-121 contain the heredocs for ARCHITECTURE.md and INTENT.md).

Write to:
- `plugins/spec-management/templates/ARCHITECTURE.md`
- `plugins/spec-management/templates/INTENT.md`

**Step 5: Verify structure**

Run: `find plugins/spec-management -type f | sort`

Expected:
```
plugins/spec-management/.claude-plugin/plugin.json
plugins/spec-management/scripts/spec-tree.py
plugins/spec-management/skills/manage-specs/SKILL.md
plugins/spec-management/templates/ARCHITECTURE.md
plugins/spec-management/templates/INTENT.md
```

---

### Task 2: Scaffold dev-kernel plugin directories and manifest

**Files:**
- Create: `plugins/dev-kernel/.claude-plugin/plugin.json`
- Create: directories for agents/, skills/, scripts/dk/, scripts/comms/, references/dk/

**Step 1: Create plugin.json**

```json
{
  "name": "dev-kernel",
  "description": "End-to-end AI dev pipeline — vision, design, plan, review, execute. Orchestrates context-isolated skills to take a vague idea through to implemented code.",
  "version": "1.0.0"
}
```

Write to: `plugins/dev-kernel/.claude-plugin/plugin.json`

**Step 2: Create directory structure**

```bash
mkdir -p plugins/dev-kernel/{agents,skills,scripts/dk,scripts/comms,references/dk}
```

**Step 3: Verify**

Run: `find plugins/dev-kernel -type d | sort`

Expected:
```
plugins/dev-kernel
plugins/dev-kernel/.claude-plugin
plugins/dev-kernel/agents
plugins/dev-kernel/references
plugins/dev-kernel/references/dk
plugins/dev-kernel/scripts
plugins/dev-kernel/scripts/comms
plugins/dev-kernel/scripts/dk
plugins/dev-kernel/skills
```

---

### Task 3: Migrate dk skills (router + phases)

**Files:**
- Create: `plugins/dev-kernel/skills/dk/SKILL.md`
- Create: `plugins/dev-kernel/skills/dk-vision/SKILL.md`
- Create: `plugins/dev-kernel/skills/dk-design/SKILL.md`
- Create: `plugins/dev-kernel/skills/dk-plan/SKILL.md`
- Create: `plugins/dev-kernel/skills/dk-review/SKILL.md`
- Create: `plugins/dev-kernel/skills/dk-batch/SKILL.md`

**Step 1: Copy dk router skill**

Copy from: `/Users/mr.leaf/git/ai-dev-kernel/skills/dk/SKILL.md`
Write to: `plugins/dev-kernel/skills/dk/SKILL.md`

Update: Replace `bun dk:launch` references with `tsx ${CLAUDE_PLUGIN_ROOT}/scripts/dk/launch.ts` (the plugin may not have package.json scripts available).

**Step 2: Copy dk-vision skill**

Copy from: `/Users/mr.leaf/git/ai-dev-kernel/skills/dk-vision/SKILL.md`
Write to: `plugins/dev-kernel/skills/dk-vision/SKILL.md`

No path changes needed — dk-vision reads/writes `tmp/initiatives/` from project root and spawns general-purpose sub-agents with inline prompts (these stay inline as they're simple consolidation agents, not reusable pipeline agents).

**Step 3: Copy dk-design skill**

Copy from: `/Users/mr.leaf/git/ai-dev-kernel/skills/dk-design/SKILL.md`
Write to: `plugins/dev-kernel/skills/dk-design/SKILL.md`

No path changes needed — same reasoning as dk-vision.

**Step 4: Copy dk-plan skill**

Copy from: `/Users/mr.leaf/git/ai-dev-kernel/skills/dk-plan/SKILL.md`
Write to: `plugins/dev-kernel/skills/dk-plan/SKILL.md`

**Critical changes:**
- Replace ALL inline agent prompts (`<CLASSIFIER-AGENT-PROMPT>`, `<ARCHITECT-AGENT-PROMPT>`, `<REVIEWER-AGENT-PROMPT>`, `<REVISION-AGENT-PROMPT>`, `<ASSEMBLER-AGENT-PROMPT>`, `<TRIAGE-AGENT-PROMPT>`) with references:
  ```
  Read the agent prompt at `${CLAUDE_PLUGIN_ROOT}/agents/plan-classify.md` and use it to prompt the sub-agent.
  ```
- Replace `bun dk:validate` with `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/dk/validate.py`
- Add instruction to read `${CLAUDE_PLUGIN_ROOT}/references/dk/TEMPLATE.md` for the assembler agent

**Step 5: Copy dk-review skill**

Copy from: `/Users/mr.leaf/git/ai-dev-kernel/skills/dk-review/SKILL.md`
Write to: `plugins/dev-kernel/skills/dk-review/SKILL.md`

No path changes needed — dk-review reads/writes `tmp/initiatives/` from project root.

**Step 6: Copy dk-batch skill**

Copy from: `/Users/mr.leaf/git/ai-dev-kernel/skills/dk-batch/SKILL.md`
Write to: `plugins/dev-kernel/skills/dk-batch/SKILL.md`

**Critical changes:**
- Replace the inline `<STAGE-AGENT-PROMPT>` with a reference to `${CLAUDE_PLUGIN_ROOT}/agents/batch-orchestrator.md`
- Replace references to `/dk-orchestrator` skill invocation with agent spawning (dk-orchestrator becomes an agent, not a skill — it was only ever called by dk-batch)
- Add instruction for the notification step to use `node ${CLAUDE_PLUGIN_ROOT}/scripts/comms/ntfy.js`

**Step 7: Verify all skills exist**

Run: `find plugins/dev-kernel/skills -name "SKILL.md" | sort`

Expected:
```
plugins/dev-kernel/skills/dk-batch/SKILL.md
plugins/dev-kernel/skills/dk-design/SKILL.md
plugins/dev-kernel/skills/dk-plan/SKILL.md
plugins/dev-kernel/skills/dk-review/SKILL.md
plugins/dev-kernel/skills/dk-vision/SKILL.md
plugins/dev-kernel/skills/dk/SKILL.md
```

---

### Task 4: Extract agent definitions from dk-plan

**Files:**
- Create: `plugins/dev-kernel/agents/plan-classify.md`
- Create: `plugins/dev-kernel/agents/plan-architect.md`
- Create: `plugins/dev-kernel/agents/plan-review.md`
- Create: `plugins/dev-kernel/agents/plan-revise.md`
- Create: `plugins/dev-kernel/agents/plan-assemble.md`

**Step 1: Create plan-classify.md**

Extract from dk-plan's `<CLASSIFIER-AGENT-PROMPT>` block. Add frontmatter:

```markdown
---
name: plan-classify
description: "Domain classification — reads design.md and classifies items into cohesive domains with cross-domain annotations"
model: sonnet
---
```

Body is the content from the `<CLASSIFIER-AGENT-PROMPT>` block in the original dk-plan SKILL.md, with `{name}` kept as a template variable the skill fills in.

**Step 2: Create plan-architect.md**

Extract from `<ARCHITECT-AGENT-PROMPT>`. Frontmatter:

```markdown
---
name: plan-architect
description: "Per-domain architecture — reads classification and source code, produces design document with decisions, rationale, and risks"
model: opus
---
```

**Step 3: Create plan-review.md**

Extract from `<REVIEWER-AGENT-PROMPT>`. Frontmatter:

```markdown
---
name: plan-review
description: "Cross-domain review — audits domain design for coverage, alternatives, architecture fit, and edge cases"
model: opus
---
```

**Step 4: Create plan-revise.md**

Extract from `<REVISION-AGENT-PROMPT>`. Frontmatter:

```markdown
---
name: plan-revise
description: "Post-review revision — addresses review findings, appends verdict section accepting or rejecting each finding"
model: sonnet
---
```

**Step 5: Create plan-assemble.md**

Extract from `<ASSEMBLER-AGENT-PROMPT>`. Frontmatter:

```markdown
---
name: plan-assemble
description: "Status YAML assembly — reads all domain designs, generates condensed specs and staged status.yaml with tickets"
model: sonnet
---
```

Add instruction to read `${CLAUDE_PLUGIN_ROOT}/references/dk/TEMPLATE.md` for the status.yaml schema.

Note: The `<TRIAGE-AGENT-PROMPT>` from step 6 stays inline in dk-plan — it's a simple single-use prompt that doesn't benefit from extraction.

**Step 6: Verify**

Run: `ls plugins/dev-kernel/agents/plan-*.md`

Expected: 5 files (classify, architect, review, revise, assemble)

---

### Task 5: Extract agent definitions from dk-batch

**Files:**
- Create: `plugins/dev-kernel/agents/batch-orchestrator.md`
- Create: `plugins/dev-kernel/agents/batch-validate.md`

**Step 1: Create batch-orchestrator.md**

This is the full content of the original `dk-orchestrator/SKILL.md` — it was only ever invoked by dk-batch, so it becomes an agent rather than a skill.

Copy from: `/Users/mr.leaf/git/ai-dev-kernel/skills/dk-orchestrator/SKILL.md`

Replace the frontmatter:
```markdown
---
name: batch-orchestrator
description: "Stage orchestrator — delegates all implementation to sub-agents. 9-step workflow: clarify, analyze, batch-spec, tickets, execute, type-check/commit, spec-sync, validate, notify."
model: opus
---
```

Remove the `argument-hint` field (agents don't have it).
Replace `$ARGUMENTS` at the bottom with a note that the launching skill passes stage details.

**Step 2: Create batch-validate.md**

This is the full content of the original `dk-validate/SKILL.md` — similarly only invoked by the orchestrator.

Copy from: `/Users/mr.leaf/git/ai-dev-kernel/skills/dk-validate/SKILL.md`

Replace the frontmatter:
```markdown
---
name: batch-validate
description: "Validation auditor — launches parallel domain review agents, compiles severity-graded report without making fixes"
model: sonnet
---
```

Remove the `argument-hint` field.

**Step 3: Verify**

Run: `ls plugins/dev-kernel/agents/batch-*.md`

Expected: 2 files (orchestrator, validate)

---

### Task 6: Migrate scripts

**Files:**
- Create: `plugins/dev-kernel/scripts/dk/launch.ts`
- Create: `plugins/dev-kernel/scripts/dk/validate.py`
- Create: `plugins/dev-kernel/scripts/comms/ntfy.js`

**Step 1: Copy launch.ts**

Copy from: `/Users/mr.leaf/git/ai-dev-kernel/scripts/dk/launch.ts`
Write to: `plugins/dev-kernel/scripts/dk/launch.ts`

No changes needed — launch.ts resolves its directory relative to import.meta.dirname. When installed into a target project, it'll resolve correctly.

**Step 2: Copy validate.py**

Copy from: `/Users/mr.leaf/git/ai-dev-kernel/scripts/dk/validate.py`
Write to: `plugins/dev-kernel/scripts/dk/validate.py`

No changes needed.

**Step 3: Copy ntfy.js**

Copy from: `/Users/mr.leaf/git/ai-dev-kernel/scripts/dk/ntfy.js`
Write to: `plugins/dev-kernel/scripts/comms/ntfy.js`

No changes needed.

**Step 4: Verify**

Run: `find plugins/dev-kernel/scripts -type f | sort`

Expected:
```
plugins/dev-kernel/scripts/comms/ntfy.js
plugins/dev-kernel/scripts/dk/launch.ts
plugins/dev-kernel/scripts/dk/validate.py
```

---

### Task 7: Migrate references

**Files:**
- Create: `plugins/dev-kernel/references/dk/PIPELINE.md`
- Create: `plugins/dev-kernel/references/dk/TEMPLATE.md`

**Step 1: Copy PIPELINE.md**

Copy from: `/Users/mr.leaf/git/ai-dev-kernel/specs/DK_PIPELINE.md`
Write to: `plugins/dev-kernel/references/dk/PIPELINE.md`

Remove the spec frontmatter (parent, children, sources, tags, context fields) — these are spec-system metadata that don't apply to references. Keep the title, summary, and content body.

**Step 2: Copy TEMPLATE.md**

Copy from: `/Users/mr.leaf/git/ai-dev-kernel/specs/DK_TEMPLATE.md`
Write to: `plugins/dev-kernel/references/dk/TEMPLATE.md`

Same treatment: remove spec frontmatter, keep content.

**Step 3: Verify**

Run: `ls plugins/dev-kernel/references/dk/`

Expected: PIPELINE.md, TEMPLATE.md

---

### Task 8: Write init.sh

**Files:**
- Create: `plugins/dev-kernel/scripts/init.sh`

**Step 1: Write the init script**

The script must:

1. Resolve its own directory to find `${CLAUDE_PLUGIN_ROOT}`
2. Accept a target directory argument (default: `.`)
3. Check for spec-management plugin — look for `manage-specs` skill in the target's `.claude/skills/` or check if the plugin is registered. If not found, print error and `exit 1`:
   ```
   ✗ Required companion plugin not found: aahl-byte-plugins/spec-management
     Install it first:
       claude plugin install aahl-byte-plugins/spec-management
   ```
4. Copy `scripts/dk/launch.ts` and `scripts/dk/validate.py` to target `scripts/dk/`
5. Copy `scripts/comms/ntfy.js` to target `scripts/comms/`
6. Add package.json scripts if package.json exists (dk:launch, dk:validate, ntfy)
7. Create `tmp/initiatives/` and add `tmp/` to .gitignore
8. Print success summary

**Step 2: Make executable**

```bash
chmod +x plugins/dev-kernel/scripts/init.sh
```

**Step 3: Verify**

Run: `head -5 plugins/dev-kernel/scripts/init.sh && bash -n plugins/dev-kernel/scripts/init.sh`

Expected: No syntax errors.

---

### Task 9: Final verification and cleanup

**Step 1: Verify complete tree**

Run: `find plugins/dev-kernel plugins/spec-management -type f | sort`

Expected output should match the proposal structure exactly.

**Step 2: Verify no leftover references to old paths**

Run: `grep -r "skills/manage-specs" plugins/dev-kernel/` (should return nothing)
Run: `grep -r "specs/DK_" plugins/dev-kernel/` (should return nothing)
Run: `grep -r "scripts/spec-tree" plugins/dev-kernel/` (should return nothing)

**Step 3: Verify agent references in skills**

Run: `grep -r "CLAUDE_PLUGIN_ROOT" plugins/dev-kernel/skills/ | head -20`

Should show references to `${CLAUDE_PLUGIN_ROOT}/agents/`, `${CLAUDE_PLUGIN_ROOT}/scripts/`, and `${CLAUDE_PLUGIN_ROOT}/references/` in dk-plan and dk-batch skills.

**Step 4: Commit**

```bash
git add plugins/spec-management plugins/dev-kernel
git commit -m "feat: restructure ai-dev-kernel into spec-management + dev-kernel plugins

Two-plugin architecture:
- spec-management: standalone spec maintenance (manage-specs skill, spec-tree.py, scaffold templates)
- dev-kernel: AI dev pipeline (dk router + 5 phase skills, 7 extracted agents, namespaced scripts)

dev-kernel depends on spec-management at init time (init.sh checks and exits non-zero if missing).
Runtime boundary: dev-kernel reads specs/, spec-management writes specs/."
```
