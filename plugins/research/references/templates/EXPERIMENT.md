# <ID> experiment record

Written for an auditor checking whether the conclusion follows. Runs are referenced by commit hash,
not by date.

## Deviations from the pre-registration
Read first. Each deviation with its reason and its kind:
- *operational* (cannot move a value: scheduling, slot counts, a memory cap, a hardware move with an
  identical parity line);
- *criterion-touching* (changes what is measured or how it is judged), with the audit that cleared it.

No deviation softens a frozen label.

## Question and hypotheses

## Design
Why this design answers this question rather than an adjacent one.

## Code
Each file, what it does, and how to re-run everything (`run.sh`).

## Oracle validation
Each oracle's result, the regime it covered, and its mutation: what was broken and how the oracle
responded. The mutation tally on the final tree.

## Integrity
Units verified, versions locked, the parity line per machine, and the kill-and-resume test.

## Runs
Every run with raw numbers and sweeps, and where its outputs live.

## Reconciliation
Each measurement against its prediction. A value far from every prediction is a discovery or a
defect; say which, and why.

## Self-falsification
Where the surviving hypothesis breaks.

## Conclusion
The verdict, with the stopping rule's triggers quoted and evaluated, and the regime it holds in.

## Interrogation
- Does this spawn another experiment?
- Does something in the experiment need fixing, and does that mean revalidating?
- Did we make a stupid mistake somewhere? What was checked.

## Regime of validity and known limitations
