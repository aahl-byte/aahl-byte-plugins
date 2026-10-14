---
# Research programme config. Every research skill and agent reads this first.
# Paths are relative to the project root. Delete a key to take the default shown.

catalogue: docs/research/CATALOGUE.md        # questions: index rows plus full entries
results: docs/research/results               # one <ID>.md per answered question
spikes: spikes                               # one <id-lowercase>/ directory per spike
criterion_audit: docs/research/CRITERION_AUDIT.md   # the project's defect-class catalogue
leads: docs/research/leads                   # lead-card batches and TALLY.md
experts: docs/research/experts               # one store per standing expert
scratch: .scratch/research                   # bulk data, venvs, downloads; must survive a reboot
brief: ""                                    # optional project brief every spike brief points to
status: ""                                   # optional status document a fold updates when a result changes what is settled

resume_note: .scratch/research/RESUME.md     # or todo:<item-id> to keep it in a todo item's note
commit_trailer: ""                           # appended to every research commit, e.g. "Research-Programme: x"

agent_cap: 2                                 # concurrent agents the coordinator runs at once

tiers:                                       # kill-risk → scrutiny; raise these, never lower them
  low:    {step0_audit: required-unless-ruled, reviewers: 0}   # one consumer-brief reviewer if another spike inherits
  medium: {step0_audit: required, reviewers: 1}
  high:   {step0_audit: required, reviewers: 2}

scout:
  cards_per_question: 6
  hit_floor: 0.33          # plan-changing leads per question; below it two batches running narrows the scout, a third stops it

cloud:
  project: ""              # the gpu CLI's --project for every lease; required before leasing
  tags: {}                 # extra tags on every lease, e.g. {team: physics}
---

# Project notes

Rules specific to this programme go here, in prose: hardware caps, spend limits per spike, who may
lease, the author's standing requests. Every research agent reads them.
