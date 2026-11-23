# pstack triage

Proposed fate of each skill, agent and pack in this fork. Nothing is removed until this list is approved.

- **Drop** six items: four built for Cursor or too heavy to carry (`make-bot-ui`, `ketchup-video`, the benny pack, `statechart`), plus `automate-me` and `bro`.
- **Merge** five items into the `thinking` plugin, where the user's global instructions already send prose work.
- **Keep** the rest. The 24 principles stay one file each, matching upstream, so `scripts/upstream-diff.sh` maps cleanly onto this fork.
- **Rerouting** comes with every drop or merge: poteto-mode, poteto-help, the README and `docs/guide` name these skills, so `grep -rn 'pstack:<name>'` before removing one.

## Cursor-only or heavy

| Item | Verdict | Reason | Overlaps |
|---|---|---|---|
| `skills/make-bot-ui` | drop | Builds a UI that wakes a Grok Bot through a Cursor Automations webhook. Nothing in Claude Code receives it. | none |
| `skills/ketchup-video` | drop | Renders an mp4 to embed in the chat, and the Claude Code terminal cannot play one. `ketchup` covers the same catch-up as text. | `pstack:ketchup` |
| `automations/benny` (setup-benny, triage-issue-reports, reproduce-and-fix-issues, templates) | drop | Runs only as Cursor Automations routines with Slack triggers. Its skills are not registered by the plugin. | none |
| `skills/statechart` | drop | 410 files (4 MB): a TLA+ to Mermaid pipeline that needs TLC and bun. `create-formal-verification-skill` already covers model checking for a project. Keep it only if TLA+ statecharts are wanted. | `pstack:create-formal-verification-skill` |
| `assets/logo.png` | drop | Only the Cursor manifest used it. Claude Code manifests have no logo field. | none |

## Skills

| Skill | Verdict | Reason | Overlaps |
|---|---|---|---|
| `poteto-mode` | keep | The hub that routes tasks to playbooks and runs the other skills. | `dev-kernel:dk` routes a larger staged pipeline. Different scale, so no merge. |
| `poteto-help` | keep | Answers questions about pstack. Needs its tables updated after the drops. | none |
| `setup-pstack` | keep | Writes the per-role model file every spawn reads. | none |
| `architect` | keep | Sketches types and signatures before code. poteto-mode routes to it. | `dev-kernel:dk-plan` runs architect agents per domain inside its pipeline |
| `arena` | keep | Parallel candidates, cross-judge and graft. Interrogate and eval build on it. | none |
| `interrogate` | keep | Adversarial review where a finding counts only with a run behind it. | none |
| `swarm` | keep | Fan-out and drain for coverage or races. | `dev-kernel:dk-batch` fans out stages, not checks |
| `figure-it-out` | keep | poteto-mode's fallback when no playbook fits. | `thinking:right-to-left` (planning from the end state). `dev-kernel:dk-vision` (large initiatives). Could load right-to-left rather than restate it. |
| `blast-radius` | keep | Finds what a change breaks outside the diff. | none |
| `benchmark-checklist` | keep | Vets a measured number before it is reported. | `research:fold-result` re-derives numbers for research results |
| `correct` | keep | Turns repeated agent mistakes into checks, the same idea as the inspection-app rule table. | none |
| `tdd` | keep | Red-green loop that poteto-mode's bug-fix playbook runs. | The installed `test-driven-development` skill, outside this marketplace |
| `no-comments` | keep | Spawns Comment Sicko on the diff. | none |
| `show-me-your-work` | keep | A decision log (TSV) for long or unattended runs. | `research:coordinate` keeps a dated ruling record for research |
| `recall` | keep | Rebuilds context from transcripts and live state. | none |
| `ketchup` | keep | Catches the user up on the current chat. | none |
| `how` | keep | Spawns an explorer to explain how code works. | `thinking:explaining` governs how the answer is written |
| `why` | keep | Cited read on design decisions and regressions. | none |
| `in-your-own-words` | keep | Restates the user's goal. `interrogate` runs it. | none |
| `create-verification-skill` | keep | Generates a project `verify-<app>` skill. poteto-mode and setup route to it. | none |
| `maintain-verification-skill` | keep | Keeps that skill honest. User-only because it opens a PR. | none |
| `create-formal-verification-skill` | keep | Generates a project formal-verification skill. | none |
| `maintain-formal-verification-skill` | keep | Re-aligns formal verification after code changes. | none |
| `reflect` | keep | Routes learnings from a transcript into skill edits. User-only. | none |
| `typescript-best-practices` | keep | Path-scoped TypeScript rules (`**/*.ts`). | none |
| `automate-me` | drop | Drafts a personal `-mode` skill from transcripts. The user's style already lives in `CLAUDE.md` and the `thinking` plugin, and a third source would compete with both. | `thinking:writing-style` |
| `bro` | drop | Six lines: "restate the last message plainly". Asking for that directly does the same. | `thinking:explaining` |
| `teach` | merge | Runs `how` and `why`, then writes one explanation. The writing half is what `thinking:explaining` teaches. Merge as a workflow that loads `thinking:explaining`. | `thinking:explaining` |
| `technical-writing` | merge | A prose standard for docs, PRs and commits, the job the user's instructions give `thinking:writing-style`. | `thinking:writing-style` |
| `unslop` | merge | A list of AI tells to cut, the same ground as writing-style's machine-writing habits. Fold any tells writing-style lacks into it. | `thinking:writing-style` |
| `sharpen` | merge | Deepens a task by fixing what done means, then rewrites the prompt. That is right-to-left's first step. | `thinking:right-to-left` |

## Principles (24)

All keep. Each is a 10 to 20 line leaf that poteto-mode indexes and runs by name. None duplicates a `thinking`, `dev-kernel` or `research` skill, since those cover prose, pipeline and research method, not code design.

| Skill | Verdict | Reason | Overlaps |
|---|---|---|---|
| `principle-attack-the-premise` | keep | Repeated failed fixes | none |
| `principle-boundary-discipline` | keep | Guards at boundaries | none |
| `principle-build-the-lever` | keep | Tools over hand work | none |
| `principle-encode-lessons-in-structure` | keep | Rules as checks. `correct` applies it. | none |
| `principle-exhaust-the-design-space` | keep | Prototypes for novel decisions | none |
| `principle-experience-first` | keep | Product tradeoffs | none |
| `principle-explain-the-number` | keep | Measurements | `research:run-spike` holds a stricter version for research |
| `principle-fix-root-causes` | keep | Debugging | none |
| `principle-foundational-thinking` | keep | Data structures first | none |
| `principle-guard-the-context-window` | keep | Delegating bulk | none |
| `principle-laziness-protocol` | keep | Smallest change | none |
| `principle-make-operations-idempotent` | keep | Retries and crashes | none |
| `principle-migrate-callers-then-delete-legacy-apis` | keep | API migrations | none |
| `principle-minimize-reader-load` | keep | Code readability | none |
| `principle-model-the-domain` | keep | State in structures | none |
| `principle-never-block-on-the-human` | keep | Reversible work proceeds | none |
| `principle-outcome-oriented-execution` | keep | Phased rewrites | none |
| `principle-prove-it-works` | keep | Verify on the real artifact | none |
| `principle-redesign-from-first-principles` | keep | New requirements | none |
| `principle-separate-before-serializing-shared-state` | keep | Concurrent writers | none |
| `principle-sequence-verifiable-units` | keep | Small checked steps | none |
| `principle-subtract-before-you-add` | keep | Delete first | none |
| `principle-test-behavior-not-implementation` | keep | Tests | none |
| `principle-type-system-discipline` | keep | Types | none |

## Agents

| Agent | Verdict | Reason | Overlaps |
|---|---|---|---|
| `poteto-agent` | keep | The delegate that runs poteto-mode before any work. | none |
| `comment-sicko` | keep | Read-only comment reviewer behind `no-comments`. | none |
