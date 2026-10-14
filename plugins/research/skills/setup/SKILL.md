---
name: setup
description: Set up a research programme in a project — the config at .claude/research.md, a question catalogue in the fixed schema ranked by kill-risk, the project's own copy of the criterion-defect catalogue, and the directories the other research skills write to. Use when a project starts asking questions it can't answer by reasoning alone, when someone asks for a research catalogue or programme, or when any research skill finds no .claude/research.md.
---

# Set up a research programme

When this is done, the project can run the research pipeline from end to end:

- `.claude/research.md` says where everything lives.
- The catalogue holds questions in the fixed schema, ranked by kill-risk, with the top one ready to spike.
- The project has its own copy of the criterion-defect catalogue, ready to grow.
- The directories the other skills write to exist.

The method behind all of it is in `${CLAUDE_PLUGIN_ROOT}/references/METHOD.md` (the plugin root is two directories above this skill's base directory). Read it first. The templates named below are in `references/templates/`, beside it.

## 1. Write the config

If `.claude/research.md` exists, read it and keep it; this skill only fills in what's missing.

Otherwise, copy `templates/research.md` there and settle each key:

- **Paths.** The defaults put the catalogue, results, the criterion audit, leads and expert stores under `docs/research/`; spikes under `spikes/`; and scratch under `.scratch/research/`. If the project already keeps a catalogue or results somewhere, point the keys there instead of moving the files.
- **Scratch must survive a reboot,** because long runs and the resume note live there. Never put it under `/tmp`. Add it to `.gitignore`.
- **`resume_note`** defaults to a file in scratch. Use `todo:<item-id>` if the project tracks work in a todo store and the coordinator should keep the note on a todo item instead.
- **`commit_trailer`, `agent_cap` and `tiers`.** Keep the defaults unless the project has a reason to change them.
- **`cloud.project`** is needed only before the first lease. Leave it empty until then.
- **Project notes.** Anything the author has said about spend, hardware or who may do what goes in the free-text section under the frontmatter, where every research agent reads it.

## 2. Seed the criterion-defect catalogue

Copy `${CLAUDE_PLUGIN_ROOT}/references/CRITERION_AUDIT.md` to the configured `criterion_audit` path. It is the project's copy from now on. Every audit that finds a new class of defect adds it there, with the case that found it, so it grows with the programme.

## 3. Generate the questions

Start from what the project is trying to build, and ask which of its decisions can't be settled by reasoning alone. Generate broadly across every area. This is the divergent phase, so don't converge, recommend or prune yet.

For a new programme, run two independent agents on an identical written brief. Give them different models, Opus and Sonnet, each with `effort: high` set explicitly. Because the input is identical, any difference in what they return comes from the model rather than from how each was briefed.

The brief states what has already been decided and tells the agents not to relitigate it. Without that, much of what comes back covers ground already settled.

When merging:

- deduplicate where the two agree, and mark those questions as raised independently, which is evidence they're real;
- **keep both framings where they disagree**, and mark the question contested, because disagreement between independent generators is a sign the question is genuinely open;
- reconcile the kill-risk ratings last, once the question set is settled.

## 4. Write each entry in the schema

Use the schema in `METHOD.md` and the entry shape in `templates/CATALOGUE.md`. Check every entry against the three disqualifiers:

- a researcher would have to ask a clarifying question before starting;
- the criterion has no number where one is possible;
- the hypotheses are one idea wearing different hats.

Fix each failing entry or drop it. Every entry gets a null hypothesis.

## 5. Rank by kill-risk

Sort the index by how much of the project dies if the answer comes back bad. Pipeline order doesn't matter here. Check each entry's *Independent?* field against its body, because an index row can read "yes" while the entry names a blocker. The independent, high-kill-risk questions at the top are the work queue.

## 6. Scout the top of the queue

Each question is scouted when it is filed (`research:literature-scout`), so the planner and the criterion auditor have its lead cards before gate 1. At setup, scout the questions you will spike first. Scout the rest as they come up.

## 7. Create the directories and commit

Create the results, spikes, leads and experts directories, and the scratch directory. Write the resume note from `templates/RESUME.md`. Then stage the config, the catalogue, the criterion audit and `.gitignore` by name, read the staged diff, and commit.

From here, the coordinator runs the programme with `research:coordinate`.
