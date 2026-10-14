---
name: coordinate
description: Run a research programme as its coordinator — the one session that owns the catalogue, the rulings, every lease and every commit. Covers briefing runners, commissioning audits and reviews and saving them verbatim, ruling in dated sections, freezing by diff and sha256, classifying post-freeze deviations, the one diagnosed repair, launching and waiting on compute, the agent economy, the resume note, and reporting to whoever commissioned the work. Use whenever you are directing spikes rather than running one.
---

# Coordinate a research programme

You are the coordinator. You own the catalogue, the rulings, every lease and every commit. Runners build and measure, auditors attack criteria, and reviewers attack results. You decide what each of their outputs is worth, and you keep the record able to show what was said separately from what was decided.

When a spike reaches the record, everything about it can be checked by someone who wasn't there:

- each audit and review is saved verbatim;
- each ruling quotes what it accepted;
- the frozen criterion has a sha256;
- each deviation has a kind and a reason;
- the verdict was graded exactly as frozen.

The method is in `${CLAUDE_PLUGIN_ROOT}/references/METHOD.md` (the plugin root is two directories above this skill's base directory), and the templates are beside it in `references/templates/`. Paths below are defaults; `.claude/research.md` overrides them.

## At the start of every session

Read `.claude/research.md`, then the resume note. The note says what is running where, and what comes next. Check that each PID and lease it names is still alive (`ps -p <pid>`, `gpu status`) before acting on it.

## Choose the batch

Take the independent questions with the highest kill-risk first. Select the batch for code isolation, not for throughput. Two spikes that share an instrument can corrupt each other: one editing a shared solver while the other measures through it produces results that look fine and are worthless. A batch drawn from different areas is safer than a batch of neighbours in one chain.

Check each entry's *Independent?* field against its body before launching. Make sure each question has been scouted (`research:literature-scout`).

Stay within `agent_cap`, which defaults to two concurrent agents. Running twelve spikes is cheap; reading twelve reports carefully is not, and reading them carelessly defeats the protocol. When reports become the bottleneck, give a whole family of related questions to one orchestrator. It runs one runner per spike, attacks each result before accepting it, and returns one consolidated report. It is also the place where cross-spike findings become visible.

## Brief a runner

Launch `research:spike-runner` with model and effort set explicitly. The brief carries five things:

1. **The protocol and the tier**: `research:run-spike`, at this kill-risk.
2. **What the spike is about, and what it is for.** Name the consumers.
3. **The constraints**: the spike directory, no staging, no leasing, foreground builds, and the agent id to report to.
4. **Context that postdates the catalogue entry.** This is the item most often missed. Entries go stale as decisions land, and a spike briefed only from its entry will faithfully answer a question nobody has any longer.
5. **The lead cards** for the question.

## Gate 1: audit, rule, freeze

**Commission the audit.** When the runner hands over its draft pre-registration, launch `research:criterion-auditor`. It must not be the runner, and it must not be you if you drafted the criterion. Give it the draft, the lead cards and the parent spikes.

**Save the audit verbatim** at `<spikes>/<id>/audit/STEP0_AUDIT.md`. Later rounds go in their own files, for example `ADDENDUM_2_AUDIT.md`, with the round number. Never paraphrase an audit into the rulings. A later reader has to see what the auditor said and what was decided, separately.

**Rule in `audit/COORDINATOR_RULINGS.md`**, from its template, one dated section per round. Each finding is accepted, accepted amended, or rejected, with the reason, and each ruling quotes the text it accepts. A rejection needs a reason a later auditor could check. Rulings are appended, never rewritten.

**Freeze by reading the diff.** The runner applies the rulings as a new revision and hands back the diff and the sha256.

- If the diff holds only the ruled text, it freezes. Write the sha256 to `PREREGISTRATION.sha256`, and to a freeze section of the rulings.
- If the diff adds anything beyond the ruled text, send those lines to the auditor first, save that check verbatim too, and rule on it.

**Grow the defect catalogue.** When an audit names a new defect class, add it to the project's `CRITERION_AUDIT.md` as a one-line lesson, with the case that found it.

## After the freeze

**Deviations come in two kinds:**

- *Operational* changes can't move a value: scheduling, slot counts, a GPU memory cap, a hardware move with an identical parity line. Record each one in the rulings with its reason.
- *Criterion-touching* changes alter what is measured or how it is judged. They go to the auditor before anyone uses them.

A deviation never softens a frozen label. "Instrument-failed" stays instrument-failed, even when the check it applies to moves somewhere fairer.

**Nothing is repaired after the gate.** A failure becomes the finding, and the repair becomes a new question.

**An instrument that fails its gate gets one diagnosed repair.** Rule on it as a single frozen change:

- **Diagnosis comes before design.** Have the runner re-derive the failure from retained data. Name the competing readings, choose readings that predict different repairs, and tell them apart before anyone proposes a fix.
- **A bug in the harness is a code fix, not the repair.** Fix it red-first. It doesn't count against the instrument.
- **Bars keep their meaning.** No bar is set from the runs used to diagnose the failure. Any new precision bar is derived from what consumes it.
- **Validation runs on fresh seeds only.**
- **The repair is frozen as an addendum** after an independent audit, with its own sha256.
- **The cost stays inside the budget.**

If the repaired instrument fails, the verdict is `instrument-failed`, spending stops, and the failure becomes the result.

## Run compute

Runners build and test in the foreground and then stop. You launch long jobs. While a job runs, its runner stays idle. When the job lands, resume the runner by message to its agent id; it still has its full context.

- **Local jobs:** start detached, at `nice -n 19` on a shared machine, with output to a file: `setsid nohup <cmd> > <spike>/logs/<name>.log 2>&1 < /dev/null &`. Launch through your harness's background mode, so you are notified when the job exits.
- **Cloud jobs:** use `research:cloud-compute`. You own every lease and every stop.

Before grading, check that the runner did its integrity checks:

- every unit is verified;
- lock or version checks pass;
- each machine has a parity line;
- any chain that claims to resume survived a deliberate kill-and-resume.

## Waiting

- Launch detached and wait for the completion notification.
- Never poll in a sleep loop. A waiter whose check matches its own command line never finishes, and a hung waiter can't be told apart from a slow job.
- Write output to files, never through pipes.
- Kill by PID. `pkill -f` matches the shell running it. Check what else is running first, because shared machines run other projects.

## Review

Commission reviewers by tier (`research:spike-reviewer`), each on a named brief:

- **medium:** one reviewer;
- **high:** two, one on construct and consumers, the other on implementation, re-deriving from raw data without the spike's library.

Whenever another spike will inherit the result, one brief is the consumer brief.

Save each review verbatim at `<spikes>/<id>/review-<x>/REVIEW_<X>.md`. The runner applies the reviewers' replacement text word for word. Where the reviews disagree, rule which side to take, and why, in a dated section of the rulings.

## Fold

Fold every result with `research:fold-result` before trusting any of it. That skill carries the re-derivation, the impact audit and the record update.

Two of its rules fire outside the fold as well:

- **An impact audit fires the moment a defect is found** in anything shared, before anyone shows it mattered.
- **Claims strengthen as they travel.** Whenever you quote a result, compare the result file with the spike's record, and the record with the raw data.

## Commit

Only you commit. Stage named paths, never `git add -A`. Read the staged diff, then commit with the config's `commit_trailer`. Concurrent staging by agents has taken commits off branches, which is why nobody else stages.

## The agent economy

- Run at most `agent_cap` agents at once.
- **Choose the model by role, and set it explicitly on every agent:** Opus for judgement (planning, audits, reviews, scouting), Sonnet for mechanical work, never Fable.
- **Set effort explicitly on every agent:** `low` for lookups and waiting, `medium` for mechanical work, `high` for audits, reviews and planning, and `xhigh` only for long judgement work.
- Pass both rules into every brief, so agents that spawn agents follow them too.
- Runners stay idle while compute runs.
- Builds run in the foreground. An agent that backgrounds a build and ends its turn never wakes.
- Mutation sweeps run in a copy of the tree whenever a live chain might be pushed from the tree.
- Tell every agent the exact agent id to report back to.

## The resume note

Keep one living note at the config's `resume_note`. By default it is a file in the project's scratch directory, from `templates/RESUME.md`; with `todo:<item-id>`, it is that todo item's note instead.

**The note must survive a reboot. Never keep it under `/tmp`**, which a reboot wipes.

Rewrite the note at every state change, so that a reboot or a context reset loses nothing. It records:

- what runs where, with PIDs and clusters;
- which agents are idle, and what resumes each one;
- the next steps, in order;
- the rulings in force.

Delete untrue lines; the note shows the present, and git or the todo item keeps the history.

## Report to whoever commissioned the work

- **Speak in their terms.** Use the product's or the game's language, and leave out spike IDs and verdict vocabulary up front.
- **Answer questions yourself first.** When a question comes up, send it to a subagent to derive the answer before asking anyone.
- **Ask the person only what needs them.** That means a judgement of feel, or a large call on cost or scope. Batch those questions together, alongside everything already done.

Load `thinking:all` before writing anything a person will read.
