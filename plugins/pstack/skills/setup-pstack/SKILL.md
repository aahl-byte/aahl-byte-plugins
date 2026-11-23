---
name: setup-pstack
description: Configure which models pstack uses per role and at what reasoning budget. Detects your available models and writes an always-applied rule that overrides the skill defaults. Use for /pstack:setup-pstack, "configure pstack models", "pstack budget", or changing pstack's model choices.
disable-model-invocation: true
---

# Setup pstack

Write `~/.claude/rules/pstack-models.md`, a rule file that sets pstack's model and effort per role. Claude Code loads every `.md` file in `~/.claude/rules/` into each new session.

## Steps

### 1. Detect available models

The models are the `model` values the `Agent` tool schema lists, minus `fable`, which pstack never uses: normally `opus`, `sonnet` and `haiku`. The efforts are its `effort` values up to `xhigh`: `low`, `medium`, `high`, `xhigh`. Write a role value as `<model> <effort>`, such as `opus xhigh`. The effort is the last token. The aliases `inherit-parent` and `auto` are always valid.

### 2. Load current state

The default role-to-model mapping is the rule shape shown in step 5 below. If `~/.claude/rules/pstack-models.md` already exists, read it and treat its `# budget` line and its role values as the current choices. Otherwise start from those defaults. A line whose role is not in step 5, such as `hardest tasks`, `architect runners`, `reflect tooling`, or `why investigators`, is from a retired role. Drop it.

A rule without the `# defaults: 4` line comes from an older setup that wrote model slugs. Before step 3, convert each value and tell the user which ones you converted:

- `claude-<family>-<version>-<effort>[-fast]` becomes `<family> <effort>`, so `claude-opus-5-5-xhigh-fast` is `opus xhigh`.
- A `claude-fable-*` slug becomes `opus` at its effort.
- A `gemini-*` or other non-Claude slug becomes `sonnet` at its effort, so a panel still gets a second model.
- An effort above `xhigh` becomes `xhigh`, and `# budget: unlimited` becomes `large`.

Every other value is the user's choice and stays, including every `inherit-parent` or `auto` value.

### 3. Budget, map, and confirm

**(a) Ask for a budget.** Prefer `AskUserQuestion` over free text. In `-p` mode it is absent, so ask in plain text. Offer these three options with these exact labels, and name the current budget when the rule records one. With no rule, say that `large` matches the skill defaults.

- `large — xhigh reasoning`
- `medium — high reasoning`
- `small — medium reasoning`

**(b) Apply it.** Build the working table from the skill defaults, and on a re-run keep any role you changed by model, list, or alias (`inherit-parent`, `auto`). Each role has a target effort, which is its default's effort moved by the budget. `large` keeps it, `medium` lowers it one step, and `small` lowers it two steps, on the ladder `xhigh` > `high` > `medium` > `low`. No role runs above `xhigh`, and a target at the bottom of the ladder stays there. Set the effort of every value in the role, panel entries included, to the role's target. So `medium` turns `opus xhigh` into `opus high` and `opus high` into `opus medium`, and `small` turns them into `opus medium` and `opus low`. `inherit-parent` and `auto` do not change.

**(c) Show the roles and confirm.** Show every role with its value, marking any model not in the detected set as needing a choice. Also list each line step 2 dropped or converted. Ask whether to accept as-is or change specific roles, offering the detected models at `xhigh` or below plus `inherit-parent` and `auto` (both mean: this role runs on the parent's model) as the options. Prefer `AskUserQuestion` over free text. For panel roles (arena runners, interrogate reviewers) the value is a list, and one subagent runs per entry, alias entries included, so the list length sets the count. Keep at least one entry whose model differs from the others, so a panel gets a second model. `arena cross-judge pool` is also a list, but Arena runs one judge. It tries only values whose model differs from the parent's, in list order, so order it by preference. An `inherit-parent` or `auto` value never judges. `swarm workers` is the default for every worker unless a race or comparison assigns another model per arm.

### 4. Validate

Every value written is `<model> <effort>` with a detected model other than `fable` and an effort at `xhigh` or below, or `inherit-parent` or `auto`. If a chosen value is not available, stop and ask again.

### 5. Write the rule

Write `~/.claude/rules/pstack-models.md` with no frontmatter: the comment lines, the `# defaults: 4` line, a `# budget` line with the chosen label and the effort that label names, and one line per role, using the same labels poteto-mode uses. Overwrite the whole file so re-runs stay idempotent. Never put the role lines in `CLAUDE.md` or `AGENTS.md`. Shape:

```
# pstack model configuration. One line per role: `<model> <effort>`, passed as the Agent tool's `model` and `effort`. Delete a line to fall back to the skill default.
# `inherit-parent` or `auto` as a value: the role runs on the parent's model at the role's default effort. Alias entries in a panel list still count toward its fan-out.
# defaults: 4
# budget: large (xhigh)
feature, refactoring: opus xhigh
bug-fix: opus xhigh
perf-issue: opus xhigh
hillclimb: opus xhigh
judgment and prose: opus xhigh
arena runners: opus high, opus high, sonnet xhigh
arena cross-judge pool: opus high, sonnet xhigh
swarm workers: opus high
interrogate reviewers: opus high, opus high, sonnet xhigh
```

### 6. Confirm

Tell the user the rule was written and that it applies to new sessions. Re-running this skill updates it.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof (a `verify-*` skill, or an existing harness). If not, offer once: "want a project-local verification skill, so agents can drive the app the way a user does and prove changes work? I can generate one with /pstack:create-verification-skill." On yes, invoke `/pstack:create-verification-skill`. On no, move on without pushing.

### 8. Offer a formal verification skill (optional)

Check whether the project already has a formal verification skill (a project skill that runs a model checker, a proof, or another verifier against the code). If not, offer once: "want a formal verification skill, so agents can prove a key property of your code holds in every case in scope, not only the cases tests reach? I can generate one with /pstack:create-formal-verification-skill." On yes, invoke `/pstack:create-formal-verification-skill`. On no, move on without pushing.
