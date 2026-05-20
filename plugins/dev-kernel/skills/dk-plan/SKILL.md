---
name: dk-plan
description: Dev-kernel pipeline — implementation planner. Takes a consolidated design file and produces a triaged execution plan (status.yaml) through a 7-step domain-driven design pipeline. Classifies items into domains, runs parallel architect + reviewer agents, assembles stages, and auto-triages deferrals.
argument-hint: "{initiative-name}"
---

<CRITICAL-ACTIONS>
1. You MUST receive an initiative name. Read the design file at `tmp/initiatives/{name}/design.md`.
2. Consolidation guard: read `tmp/initiatives/{name}/dive-tracker.yaml`. If it exists and `status` is NOT `ready`, HALT and tell the user to complete consolidation first.
3. Check `tmp/initiatives/{name}/progress.plan` for crash recovery. Skip completed steps.
4. Write/update `progress.plan` after EACH step completes.
</CRITICAL-ACTIONS>

---

The planner NEVER performs design or implementation directly. All steps are delegated to sub-agents that write output to disk.

Protect your context window. Your task is only to schedule and delegate. You do not ever want to receive the output of your sub-agents.

---

## Crash Recovery

```
tmp/initiatives/{name}/progress.plan -> "step-1" through "step-7"
```

---

## Pipeline

```
design.md → Step 1: Classify → Step 2: Architect → Step 3: Review → Step 4: Revise → Step 5: Assemble → Step 6: Triage → Step 7: Notify
```

---

## Step 1 — Domain Classification

Spawn a single sub-agent using the prompt from `${CLAUDE_PLUGIN_ROOT}/agents/plan-classify.md`.

Pass the initiative name so it can resolve file paths. The agent writes to `tmp/initiatives/{name}/classification.md`.

After completion, read the classification and extract domain names/slugs.

---

## Step 2 — Domain Architects (parallel)

For each domain, spawn a sub-agent using the prompt from `${CLAUDE_PLUGIN_ROOT}/agents/plan-architect.md`.

Pass the initiative name and the domain slug. Each agent writes to `tmp/initiatives/{name}/designs/{domain-slug}.md`.

Launch ALL architect agents in parallel.

---

## Step 3 — Domain Reviewers (parallel)

For each domain, spawn a sub-agent using the prompt from `${CLAUDE_PLUGIN_ROOT}/agents/plan-review.md`.

Pass the initiative name and the domain slug. Each agent appends a `## Review` section to `tmp/initiatives/{name}/designs/{domain-slug}.md`.

Launch ALL reviewer agents in parallel.

---

## Step 4 — Architect Revision (parallel)

For each domain, spawn a sub-agent using the prompt from `${CLAUDE_PLUGIN_ROOT}/agents/plan-revise.md`.

Pass the initiative name and the domain slug. Each agent appends a `## Verdict` section to the design document.

Launch ALL revision agents in parallel.

---

## Step 5 — Assembly

Spawn a single sub-agent using the prompt from `${CLAUDE_PLUGIN_ROOT}/agents/plan-assemble.md`.

Pass the initiative name. The agent reads `${CLAUDE_PLUGIN_ROOT}/references/dk/TEMPLATE.md` for the status.yaml schema and produces `tmp/initiatives/{name}/status.yaml`.

Validation command: `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/dk/validate.py tmp/initiatives/{name}/status.yaml --verbose`

---

## Step 6 — Auto-Triage & Deferral

Spawn a single sub-agent to split automatable vs. deferred work.

The agent must:
1. Read `tmp/initiatives/{name}/status.yaml`.
2. Read ALL design documents for context.
3. Scan for deferral signals — tickets that require manual work the agent cannot do:
   - Database migrations or schema changes
   - External system dependencies
   - Blocked prerequisites requiring human action
   - Infrastructure provisioning
4. Produce:
   - Pruned `tmp/initiatives/{name}/status.yaml` (active tickets only)
   - `tmp/initiatives/{name}/deferred.yaml` (grouped by reason)
   - `tmp/initiatives/{name}/questions.md` (open questions, categorized by urgency)
5. Validate: run `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/dk/validate.py tmp/initiatives/{name}/status.yaml --verbose`. Fix any errors.
6. Return summary: active tickets, deferred tickets, stages, questions.

---

## Step 7 — Notify and HALT

1. Update `progress.plan` to `step-7`.
2. Return summary to the router:
   - `status.yaml` — active plan ({N} tickets, {M} stages)
   - `deferred.yaml` — tickets requiring manual work
   - `questions.md` — open questions
