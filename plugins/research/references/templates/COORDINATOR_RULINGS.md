# <ID> coordinator rulings

Each audit and review this file rules on is saved verbatim beside it. Each ruling is a dated section
that quotes what it accepts, so a reader can see what the auditor said and what was decided,
separately. Sections are appended, never rewritten.

## <What is being ruled on> (<YYYY-MM-DD>)

Source: `audit/<FILE>.md`, verbatim.

- **Finding <n>: accepted.** <quote or name the repaired text>
- **Finding <n>: accepted amended.** <the amendment, and why>
- **Finding <n>: rejected.** <why>

## Freeze (<YYYY-MM-DD>)

`PREREGISTRATION.md` frozen at sha256 `<hash>`. The diff from the last revision holds only the ruled
text | the auditor checked the added lines in `audit/<FILE>.md`.

## Deviation <n> (<YYYY-MM-DD>)

Operational | criterion-touching. <what changed and why>. <For criterion-touching: the audit that
cleared it.> The frozen labels stand.
