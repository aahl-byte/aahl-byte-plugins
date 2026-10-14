# Criterion audit: defect classes

A criterion can read like a number and still be unmeasurable. Each class below is one way that happens. Each entry gives the class, the lesson (usually the check that catches it before the freeze) and the case that found it. A criterion auditor checks a draft against every class. Each audit that finds a new class adds it here, with its case.

This file is a seed. The cases come from the programme it was first grown in, which researched the physics, materials and simulation behind a game. Treat them as examples of the shape, never as rules about any domain. Replace them with your own cases as they arrive.

Most classes fall to three runs made before the freeze. Run the criterion on:

- **the null arm**, which should fail;
- **a known-wrong arm**, which should fail;
- **the reference itself**, which should pass.

A criterion that gets any of the three wrong is defective, whatever its prose says.

The original find shows how cheap a defect is to miss. A criterion required at least 70% of 500 materials to place top-3 in at least one of 10 problems. Ten problems × 3 slots ÷ 500 materials caps that at 6%. The defect survived writing, review and a week of spike work, and was found only when an agent tried to measure it.

## Can the bar be reached at all?

- **Arithmetically unsatisfiable.** Compute the bar's ceiling from the counts before freezing. *Case:* the 70%-of-500 bar above, capped at 6%.
- **Tolerance below the representation's resolution.** A bar finer than the stored format can express grades the storage, not the treatment, so doing nothing fails it. Run the criterion on the null arm. *Case:* shared vertices required to agree to 1e-6 m in an `f32` whose spacing at those coordinates is coarser; the unedited ground already differed by 13.1 mm at p99, against a 1 mm bar.
- **Model ceiling below the bar.** If the model can't reach the bar even on reference inputs, the clause measures the model, not the implementation. Run the model on reference inputs first, and grade the implementation only where that passes. *Case:* a one-constant melting law missed 10% on handbook inputs for half the metals.
- **Graded range disjoint from the reference's.** An admission window that excludes the state the reference describes fails a correct answer. Place the reference state inside every window. *Case:* a survival clause allowed 0.45% thermal expansion where the real material expands about 3%.
- **Operational definition that fails its own reference.** Run every frozen definition on the reference configuration. *Case:* "the next four neighbours sit at least 15% farther" failed the relaxed reference crystal at 11–12%.
- **Tolerance interval wider than the fact.** When the uncertainty band exceeds the quantity itself, a correct answer reads "unresolved" and only a wrong magnitude can pass. Run the reference value through the clause. *Case:* a ±4·MAE interval was wider than the formation enthalpy it graded, and the one "yes" came from a 2.7× overestimate.

## Can a useless answer pass?

- **Trivially satisfiable.** Ask what stops a useless version passing, especially when the spike builds the thing it is scored on. *Case:* a corpus of smooth blobs converges, and so passes any convergence criterion, while discriminating nothing downstream.
- **Missing a control.** A treatment measured with nothing to compare against makes any number look like a result. Pair every hit rate with a false-alarm cap, or "always say yes" passes.
- **Comparator implied by the absolute bar.** "Must beat the null" changes nothing when every null row already misses the absolute bar. Make the null a must-fail control. *Case:* every row of a classical estimate missed by 371–641 K, against a 150 K bar.
- **Control implied by its trigger.** A control that must fail whenever its trigger fires carries no information beyond the trigger. Build a control that can disagree with it.
- **Exemption that absorbs every failure.** If every disagreement lands in an exempt category, the clause can't fail. Build the failing case and check that it falls outside every exemption. *Case:* "agrees in sign or is indeterminate", where any sign disagreement at a refused point counted as indeterminate.
- **One-sided fact passed by the sign of its error.** A sign fact is a one-sided tolerance equal to its margin, so an error in the passing direction passes however large it is. Grade the arm and its mirror, 2·ref − arm. *Case:* one input's error moved a result 182 kJ in the passing direction, against a 156 kJ margin.
- **Admission rule read as sufficient where it is only necessary.** "Grades only after passing X" admits; a separate clause falsifies. Freeze the two side by side, so no deviation can quote one as the other.

## Can the control or planted fault fire?

- **Control preserves the graded invariant.** A wrong answer built by a uniform transform can keep exactly what the criterion grades. Check that each wrong arm changes some argmax, ordering or stationary value. *Case:* stretching every coordinate by 3% left every minimum's energy and every ordering unchanged.
- **Wrong control sized inside the band.** Propagate the perturbation through to the graded quantity before choosing its size. *Case:* a ×1.3 perturbation moved the graded strength 1.42× against a 1.5× bar, so any factor below 1.84 could pass.
- **Wrong control that only rescales the graded axis.** Failing a uniform ×0.85 shows only that the bar is under 15%, and real errors are mixed in sign. Add a mixed-sign, per-item control.
- **Planted control built from the measured curve.** Planting a target by subtracting the curve's own value recovers the target on any input, so it tests only the gate code. *Case:* seven mutations moved the answer by 34–200 meV, and all of them passed.
- **Planted case aimed at the rejected alternative.** Plant the change actually being made, against the frozen protocol. *Case:* a deviation was tested by planting flexible against pinned cells, while what it really changed was a box size and a new pre-stage.
- **Fault whose detection is a coin flip.** Give each planted fault a computed detection power, and test it in the space where its standard error is bounded. *Case:* a planted slow mode tripped its switch 43% of the time when tested as a time constant, and every time when tested as a rate.
- **Mutant on an input the graded route never reads.** A mutant that changes only an ignored input survives bit for bit. Assert agreement between independent routes that between them read every input.
- **Negative control refused by an admission gate.** A wrong reference rejected before the statistic runs "fails" without testing the statistic. Compare where both sides are admitted, or plant a known value.
- **The full verdict rule applied to a mutation control.** A control built to silence one mechanism can be degenerate on another clause. Grade it only on the clause it exists to silence.
- **Control power checked only at the centre.** A must-fail control that fails at the centre of the passing set can pass at its edge. Place surrogates at the passing set's extremes.
- **Surrogate chosen by a floating-point tie-break.** *Case:* 26 candidates tied to 1e-10, and a ×1.5 control survived on 8 of the ones the code didn't pick. Enumerate ties and grade every one.

## Does the statistic hide the failure?

- **Ambiguous denominator or population.** Define the base of every percentage, or it can be computed several ways with different answers.
- **Single operating point for a frontier question.** Where the answer is a curve across a parameter, grade the curve.
- **Statistic of the wrong kind.** A median says nothing about a quantity defined as a maximum, because the max operator selects exactly the outlier. *Case:* a disagreement reported as a median and p99 over all nodes read as bounded; the consumer graded a maximum over a region, where the same data diverged.
- **Many comparisons against a per-point bar.** *Case:* a perfect interpolant fails about 75% of the time when 30 held-out points each face a 2-SE bar, and a 3σ rule over 78 points fires by chance about one time in five. Correct the bar for multiplicity, or grade a statistic of the set.
- **One random seed shared across the arms of a difference.** Identical noise cancels in the difference and shrinks the error bar without improving the estimate. Seed each arm independently. *Case:* error bars 3–5× too small.
- **Spread that is zero by construction.** An arm run on one seed reports zero spread. Give every graded arm at least two realisations, or label its spread unmeasured.
- **Near-threshold verdict from a thin population.** Before calling a clause at its bar, look for one more source. *Case:* with one more fetchable source, three values moved by 0.05–0.12 eV.
- **Calibration checked overall while the verdict reads the interval's width.** Check coverage given a pass, at the regime the data occupy. *Case:* an interval covered 0.92 overall, 0.90 among the cases whose width passed, and 0.60 at the high-scatter corner.
- **Counter that measures its own resolution.** A counter that counts a step and its reversal as two events manufactures trends. Filter on what commits, and check the counts' dispersion before quoting 1/√n errors.
- **Run-long rule checked on one frame.** Bind the rule on the logged extreme, and freeze what a breach does.
- **Window shorter than the specimen's slowest stable fluctuation.** Run the clause on a known-stable specimen at the operating point before freezing.
- **A rate read through the instrument's inertia.** A timescale set by the instrument's own dynamics, such as a barostat's mass, is not the specimen's. Derive the instrument's relation or sweep its parameter.
- **Value bar blind to the derivative the decision reads.** A function within 0.4 meV of the truth can still open spurious gaps if the decision reads its curvature. Grade the quantity each decision consumes.
- **Margin between quantities at different levels.** *Case:* a tolerance compared across two levels showed a 2300× margin, against 36× measured at the same level. Compare at the same level.
- **Bound quoted at one point on a curve that runs to zero.** Report the curve and its limit.
- **Size test along the wrong axis.** Scale the dimension the failure mode depends on.

## Is the reference good enough?

- **Reference weaker than the bar.** A reference less accurate than the tolerance it adjudicates proves only agreement with a wrong number.
- **Reference admissibility untested.** Test, per item, that a usable reference exists, so that an unconverged reference isn't scored as one.
- **Reference built from the treatments it grades.** Build the reference by one frozen construction, independent of every treatment. *Case:* a reference counted only where the methods under test agreed, so the failing method was always "reference-limited".
- **References that agree while sharing the model's blind spot.** Recompute at the consumer's operating point, and carry a signed allowance.
- **Independence by author list, blind to shared method.** Disjoint authors can share the same specimen type and method. Name the shared systematics.
- **Mixed sources inside one reference.** Name the source behind every value graded. *Case:* one database carried two assessments about 16% apart.
- **Partial transcription of a fetched table.** Transcribe every row of a cited table, or record why a row is excluded.
- **Oracle that re-reads its own digitising.** Check a digitised reference against an independent reading. *Case:* a 2.5 px scan rotation was invisible to the check that reused the frozen points.
- **Mirror inside its reference's doubled uncertainty.** 2·ref − arm carries the reference twice. Label a mirror verdict within 2σ of the reference as reference-limited.
- **Null on a different quantity from the graded route.** Build the null from the same moment or statistic the graded route reads.
- **Null fitted on the graded reference.** A null whose constants are fitted on the items it is graded against is in-sample. Use leave-one-out.
- **Null missing the specimen's correlations.** Uncorrelated noise understates what the specimen's own structure produces. Build nulls from the specimen's own fluctuations.
- **Ceiling that doesn't run the route's representation.** Build a ceiling from the reference, in the route's own representation, and freeze that construction.
- **Bracket whose ends bound from one side.** Check that the bracket's ends lie on opposite sides of the quantity.
- **Graded against a condition the specimen never reaches.** Grade the specimen's own operating condition beside the textbook one.
- **Label that depends on the gauge.** State gauge-dependent labels in at least two gauges, or define them on gauge-free quantities.

## Does the selection steer the result?

- **Admission or naming rule that selects the passing regime.** Name datasets from frozen metadata, require a minimum span, and report what the rule excluded.
- **Maximum over a pre-selected population.** A maximum over a compiler's "most reliable one or two" datasets is a single comparison of datasets chosen for agreeing. Report n per endpoint.
- **Sensitivity that changes the population but keeps the selection fixed.** Re-run every selection step inside each sensitivity.
- **Admitted subset reported as the whole.** Report the unadmitted cases beside every admission-gated pass. *Case:* 165 of 165 admitted passed, while 9 of 199 overall were wrong.
- **Out-of-sample check drawn from the calibration population.** Draw the check, by frozen seed, from outside the calibration set.
- **Excluded item kept in a derived bar.** Drop an excluded item from every derived bar and interpolation, not only from the graded list.
- **Population rule that mixes regimes.** State the regime of every derived value.
- **Fit weighted onto a regime no oracle covers.** Report each point's leverage, and grade the covered regime separately. *Case:* 90% of a fit's weight sat on one point at 6.4% strain, where the oracles covered up to 1%.

## Do the oracles and instruments cover the regime?

- **Oracle regime narrower than the experiment's.** Mutation testing can't catch this, because the instrument is broken only on inputs the oracle never presents. Name each oracle's input range beside the experiment's. *Case:* a stress recovery matched its oracle to 1.35% while returning up to 3.78× the true value on mesh nodes with three or four elements, which the oracle's part never had.
- **Oracle built by the predicate that scores it.** It passes on a broken instrument. Mutation-test it.
- **Oracle tolerance wider than the margin it protects.** Count a grade only where its margin exceeds the item's measured cross-check discrepancy. *Case:* a 25% cross-check protecting an item 9% below its bar.
- **Proxy that measures its confound.** Correlate the proxy with the nearest thing it could secretly be measuring, and report the number. *Case:* a legibility metric correlated 0.987 with distance from the simplest candidate.
- **Limiting form carried past its limit.** Name the regime each inherited formula was validated in.
- **Classifier checked only on ideal inputs.** Test a classifier's blind spots on realistic inputs at the operating point.
- **Convergence axis that measures a setting's bias.** Sweeping a parameter with a known bias at one end reads as non-convergence. Test convergence in the extrapolated limit.
- **Guard blind to the failing mode.** Check the guard against every mode that can fail, not the one it was written for.
- **Invariance cancels the parameter under test.** A sweep over a quantity that drops out of the statistic passes for every value.
- **Test cited against a case it can't see.** Name every case or placement the claim covers, and test each one.
- **Graded on hardware that can't be measured.** Grade on hardware the spike can time.
- **Narrow span passes a compensating pair.** Two ends of a short span can't separate two parameters that trade off. Grade each parameter directly where a reference exists.
- **Baseline drift.** Archived outputs from an older instrument version, re-graded under new code, compare two instruments. Record the instrument's hash with every retained number.

## Does the process keep its teeth?

- **Guard dropped after it fires.** Replace a noisy guard with one of known power. Never demote it to "reported".
- **Draft verdict that skips the stopping rule.** Evaluate each trigger in the frozen stopping rule literally, and quote it, before drafting a verdict. *Case:* a runner drafted `answered-narrow` while the frozen `inconclusive` trigger had fired.
- **Stopping rule keyed to a blockable input.** When a trigger's input can be blocked, for example by a paywalled reference, state the verdict for each blocked input at the freeze.
- **One upstream error graded in several clauses.** Report a derived quantity of an already-graded input without grading it again.
- **Premise cited from a sentence awaiting correction.** Check each cited premise against the open corrections.
- **Line-based scan of wrapped prose.** Scan sentences, not lines.
- **Unacknowledged human judgement.** A clause no procedure can compute, which silently needs a rater, is unmeasurable as stated. A designed tester study is fine; an unacknowledged rater is not.
