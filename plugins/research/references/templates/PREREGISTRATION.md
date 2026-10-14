# <ID> pre-registration

Revision <n>. Frozen on <date>; the hash is in `PREREGISTRATION.sha256` beside this file. Never edited
after the freeze. A later change is an audited addendum.

## Question and end state
The catalogue question, and the checks someone else can run that show it answered. Name any context
that postdates the catalogue entry, and which source you followed where they disagree.

## What is measured
The quantity, and why it answers this question rather than an adjacent one.

## Hypotheses
H0 (null) and each competing hypothesis, including any the step-0 audit or the lead cards added.

## Procedure
Setup, inputs, what is varied, what is held fixed, and the machines it runs on. For each run: the
clause it grades, or the follow-up question that names its data, and its length, sized from an
estimate of how long the measured effect takes to appear.

## Predictions
For each hypothesis: the number expected, with a range, and its basis (a lead card, a closed form, a
parent spike).

## Criterion
Every clause precisely enough to grade without interpretation: threshold, population, units, and the
level or regime at which it binds. Quote the catalogue's wording beside any repair.

## Falsification
What result kills each hypothesis. If nothing would, the hypothesis isn't testable.

## Oracles
| Oracle | Kind (instrument or metric) | Known answer | Input range it presents | Range the experiment presents | Mutant that must turn it red |
|---|---|---|---|---|---|

Where the experiment's range is wider than an oracle's, extend the oracle or name the uncovered band
as a blind spot.

## Envelope assertions
The invariants asserted on every measurement, not just on oracle cases.

## Sensitivity
Each guessed-at parameter and the range it is swept over.

## Integrity checks
Unit verification, lock or version checks, the parity line per machine, and the kill-and-resume test
for any resumable chain.

## Gates and pilot
The cheap gates (table oracles, parity, dry fits), cheapest first, and what each failure does: send
the instrument to its one repair, or fix the verdict. The pilot's size, about 1% of production, and
the production guards that score it.

## Stopping rule
What ends the spike, each verdict's trigger stated literally, and the verdict if a blocked input stays
blocked. The futility rule: which reading, at which checkpoint, ends a run. Its reading is reported,
never graded.

## Cost
Compute budget in hours or dollars, and the cut order if it runs short.

## Consumers
The spikes or decisions that will inherit this result, and the statistic each of them reads.
