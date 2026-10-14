---
name: setup
description: Set up a research programme in a project — the config at .claude/research.md, a question catalogue in the fixed schema ranked by kill-risk, the project's own copy of the criterion-defect catalogue, and the directories the other research skills write to, including the path for adopting the programme in a project already mid-flight. Use when a project starts asking questions it can't answer by reasoning alone, when someone asks for a research catalogue or programme, or when any research skill finds no .claude/research.md.
---

# Set up a research programme

When this is done, the project can run the research pipeline from end to end:

- `.claude/research.md` says where everything lives.
- The catalogue holds questions in the fixed schema, ranked by kill-risk, with the top one ready to spike.
- The project has its own copy of the criterion-defect catalogue, ready to grow.
- The directories the other skills write to exist.

The method behind all of it is in `${CLAUDE_PLUGIN_ROOT}/references/METHOD.md` (the plugin root is two directories above this skill's base directory). Read it first. The templates named below are in `references/templates/`, beside it.

**If the project is already running**, with a backlog, agents at work, leases or a test suite, follow the steps below with the changes in *Adopting the programme mid-project*, at the end.

## 1. Write the config

If `.claude/research.md` exists, read it and keep it; this skill only fills in what's missing.

Otherwise, copy `templates/research.md` there and settle each key:

- **Paths.** The defaults put the catalogue, results, the criterion audit, leads and expert stores under `docs/research/`; spikes under `spikes/`; and scratch under `.scratch/research/`. If the project already keeps a catalogue or results somewhere, point the keys there instead of moving the files.
- **Scratch must survive a reboot,** because long runs and the resume note live there. Never put it under `/tmp`; if the project itself lives there, give scratch an absolute path outside it. Add it to `.gitignore`.
- **`resume_note`** defaults to a file in scratch. Use `todo:<item-id>` if the project tracks work in a todo store and the coordinator should keep the note on a todo item instead.
- **`todo`**, if the project keeps a todo store. The catalogue stays the one source of truth for every question's state and verdict. The store holds phases: one item per phase of the programme, with child tasks per batch or milestone, never one per question. Name the current phase's item here.
- **`commit_trailer`, `agent_cap` and `tiers`.** Keep the defaults unless the project has a reason to change them. Tiers can be raised, never lowered.
- **`local_cpus`** is the CPU list this programme may use when other projects share the machine. Ask the author for it rather than taking every CPU.

When nobody can be asked, as in a headless run, leave the key empty, take the cautious default (here, every local job at `nice -n 19`), and put the question in the resume note's next steps. The same holds for any other key that needs the author.
- **`cloud.project`** is needed only before the first lease. Leave it empty until then.
- **Project notes.** Anything the author has said about spend, hardware or who may do what goes in the free-text section under the frontmatter, where every research agent reads it.

Then create the directories the later steps write into: results, spikes, leads, direction and experts, and the scratch directory. Empty ones won't commit; each fills as the programme runs.

## 2. Seed the criterion-defect catalogue

Copy `${CLAUDE_PLUGIN_ROOT}/references/CRITERION_AUDIT.md` to the configured `criterion_audit` path. It is the project's copy from now on. Every audit that finds a new class of defect adds it there, with the case that found it, so it grows with the programme.

## 3. Generate the questions

Write the end state first, at the config's `end_state` path: the checks that say the product works, planned right to left (`thinking:right-to-left`). The generators read it, and so does every later direction audit.

Start from that end state, and ask which of the project's decisions can't be settled by reasoning alone. Generate broadly across every area. This is the divergent phase, so don't converge, recommend or prune yet.

For a new programme, run two independent agents on an identical written brief. Give them different models, Opus and Sonnet, each with `effort: high` set explicitly. This is the one place Sonnet does judgement work, because the difference between models is the point: with identical input, any difference in what they return comes from the model rather than from how each was briefed.

They may run one after the other when `agent_cap` is already in use. What must hold is their independence, because a generator that has seen the other's output turns "raised independently" into an echo:

- one brief file for both, with its sha256 checked before each run;
- a separate output file for each, in a `generation/` directory beside the catalogue;
- no merging until both have returned;
- the second started fresh, never by resuming the first.

The brief states what has already been decided and tells the agents not to relitigate it. Without that, much of what comes back covers ground already settled. It also names the paths the generators may read: the code, the end state and the project's own description. Leave out the backlog and the conclusions of earlier results. Both generators would read the same conclusions, and their agreement would then echo that input instead of showing two models arriving at a question separately.

When merging:

- deduplicate where the two agree, and mark those questions as raised independently, which is evidence they're real;
- **keep both framings where they disagree**, and mark the question contested, because disagreement between independent generators is a sign the question is genuinely open. The entry still carries one criterion, so a researcher can start without asking which: take the stronger bar, and put the other framing on the entry's **Origin:** line for the step-0 auditor to weigh. Writing the merged criterion makes you its author, so you never audit it; the independent step-0 audit does;
- reconcile the kill-risk ratings last, once the question set is settled.

## 4. Write each entry in the schema

Use the schema in `METHOD.md` and the entry shape in `templates/CATALOGUE.md`. Check every entry against the three disqualifiers:

- a researcher would have to ask a clarifying question before starting;
- the criterion has no number where one is possible;
- the hypotheses are one idea wearing different hats.

Fix each failing entry or drop it. Every entry gets a null hypothesis.

## 5. Rank by kill-risk

Sort the index by how much of the project dies if the answer comes back bad. Pipeline order doesn't matter here. Check each entry's *Independent?* field against its body, because an index row can read "yes" while the entry names a blocker. The independent, high-kill-risk questions at the top are the work queue.

Then run the first direction audit (`research:coordinate`, Direction audit). Rule on it, and send the end-state checks no question serves back through step 3. A gap the audit names needs one fresh generator briefed on that gap, not two; mark what it raises as coming from the direction audit, not as raised independently.

## 6. Scout the top of the queue

Each question is scouted when it is filed (`research:literature-scout`), so the planner and the criterion auditor have its lead cards before gate 1. At setup, scout the questions you will spike first. Scout the rest as they come up.

## 7. Commit

Copy `templates/leads/TALLY.md` into the leads directory, and write the resume note from `templates/RESUME.md`. Then stage by name everything setup wrote:

- the config, the end state, the catalogue and the criterion audit;
- the generation brief, its sha256, both outputs and the merge record;
- the direction audit and its rulings;
- `.gitignore`, `<leads>/TALLY.md` and any leads batch files;
- for an adoption, the test baseline and the prior-evidence folds.

Read the staged diff in full, and commit.

From here, the coordinator runs the programme with `research:coordinate`.

## Adopting the programme mid-project

A running project brings a backlog, results, live work and its own tools. Each one enters the programme without being treated as something it isn't.

**The backlog.** Open tasks are often research questions in all but schema. Run the two generators blind to them first (step 3), by leaving the backlog off the paths their brief lets them read, then merge the backlog in. Only a match from a blind generator counts as raised independently. A backlog task enters the catalogue only after it passes the three disqualifiers (step 4) and gets a kill-risk rank. When it enters, mark its todo task done with a note naming the catalogue ID, or every ID when it splits across questions. A task that isn't a question stays in the store as engineering (`research:coordinate`, Work that isn't a question).

**Earlier results.** None had a frozen criterion, so none carries a verdict. Fold each one as `prior-evidence` (`METHOD.md`, Verdicts): interrogate it and re-derive one number, then link it from its question's **Prior evidence:** line. Keep the fold, its re-derivation and any impact audit in `<spikes>/prior-<YYYY-MM-DD>-<name>/fold/`, the layout a spike's fold uses. The question stays `open`. *Example:* in the originating programme, every spike run before the protocol found its own criterion defective.

**Live work.**

- Let an in-flight chain finish, rather than interrupting a running job to switch rules. Take over its lease at once: record it in the resume note and set its deadline wakeups (`research:cloud-compute`).
- Take over a local job the same way, even one no agent or lease owns any more: record it in the resume note, renice it and pin it to `local_cpus` (`renice -n 19 -p <pid>`, `taskset -a -cp <local_cpus> <pid>`), and set a wakeup before its expected end.
- Message each running agent the new rules. From then on it neither commits nor leases.
- Keep existing lease wrappers if they write the broker's lease fields. Read what each passes to `gpu lease`: the description fields, `--max-hours`, `--idle-minutes`, and whether it pulls outputs home. Record any gap in the project notes. Their owner becomes the coordinator.

**The test suites.** Run them once at adoption and commit the list of tests already failing, beside the catalogue. Otherwise an old red test gets blamed on the first spike that runs near it.

