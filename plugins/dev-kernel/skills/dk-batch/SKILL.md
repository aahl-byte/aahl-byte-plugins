---
name: dk-batch
description: Dev-kernel pipeline — stage executor. Executes approved stages from status.yaml in series. Spawns sub-agents per stage with adaptive retry/halt gates. Handles crash recovery by reading stage completion status.
argument-hint: "{initiative-name}"
---

<CRITICAL-ACTIONS>
1. Verify `tmp/initiatives/{name}/progress.review` reads `review-finalized` before executing.
2. Spawn stage orchestrator agents using the prompt from `${CLAUDE_PLUGIN_ROOT}/agents/batch-orchestrator.md`.
3. Protect your context window. Delegate ALL implementation to sub-agents.
4. When a stage agent returns, ALWAYS continue immediately — update status, notify, launch next stage.
</CRITICAL-ACTIONS>

---

# Crash Recovery

Uses `status.yaml` itself — completed stages have `status: done`. On startup, find the first stage without `status: done` and resume from there.

---

# Step 1 — Launch Stage Orchestrator

For each stage, spawn a sub-agent using the prompt from `${CLAUDE_PLUGIN_ROOT}/agents/batch-orchestrator.md`.

The agent prompt must include:
1. The agent prompt content from `${CLAUDE_PLUGIN_ROOT}/agents/batch-orchestrator.md`
2. Instruction to read `CLAUDE.md` if it exists for project rules
3. Instruction to read `tmp/initiatives/{name}/status.yaml` for stage structure and tickets
4. For each domain referenced in the stage's tickets, instruction to read its spec at `tmp/initiatives/{name}/specs/{domain-slug}.md`
5. The specific stage ID to execute

Launch with the Agent tool (do NOT use `run_in_background`).

---

# Step 2 — Evaluate Outcome (Adaptive Gate)

After each stage returns:
- **Clean / minor** → proceed to Step 3.
- **Recoverable** (type errors, clear fixes) → retry once with targeted guidance. Second failure → catastrophic.
- **Catastrophic** → notify user, mark stage `blocked`, halt.

---

# Step 3 — Update status.yaml

```yaml
    status: done                # or "blocked"
    completed: "<YYYY-MM-DD>"
    commit: "<short SHA>"
    validation: "tmp/validations/<batch-id>-v<N>/ — <CLEAN|FINDINGS>"
```

---

# Step 4 — Repeat or Finalize

- More stages → back to Step 1.
- All done → run final validation, report summary, notify via `node ${CLAUDE_PLUGIN_ROOT}/scripts/comms/ntfy.js "Initiative {name} complete"`.
