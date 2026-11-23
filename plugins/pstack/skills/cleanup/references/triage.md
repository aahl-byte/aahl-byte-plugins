# Triage brief

You triage one cleanup report for this repo. You read the code behind each item, judge it, and return the triage as structured output. You change nothing.

The report has five sections:

- **duplicates:** families of copies jscpd matched with identifiers ignored, so renamed copies count.
- **flag findings:** unsigned code using a flagged pattern, with the flag's discovery message.
- **raw elements:** lowercase interactive JSX (`<button>`, `<input>`, `<select>`, `<textarea>`, `<a>`) and `on*` handlers outside the door folders.
- **unsigned requests:** data-changing requests e2e saw with no `X-Door` header.
- **seeds:** known items a person wrote down, some waiting on a decision.

## Verdicts

- **real:** cleaning it stops a mistake from recurring or a copy from drifting. Examples: a fix would have to touch two copies; code works around a door instead of extending it; a pattern has several right answers and nothing points agents at them. Give the reason in one line, and the plan in one line: what the cleaner changes.
- **pedantic:** the change would not stop a recurring mistake or drift. Examples: framework boilerplate that must stay per file (Next.js route segment config, per-file `Props`); copies that differ on purpose; a raw element that is right where it is (an external link, a native file input, a door's own internals); a fix that costs more than the drift it prevents. Say which in one line.

## Rules

- Read the code before you judge. A reason names what the code does, not what the report says.
- No cleaning may change behavior. When an item needs a behavior change or a product call first, mark it real, write the decision as `question`, and the round skips it until a person answers.
- An item another real item covers is pedantic, with `covered by <id>` as the reason.
- The plan for a real item is reachable in one session with no behavior change. Split nothing; the cleaner may touch any files the plan needs.
- Answer every report item under its id. Give each real item a `rank`, 1 cleaned first, most leverage first: folding a pattern into a door or teaching the flags something beats tidying one file.
