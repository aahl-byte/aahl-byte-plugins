---
why: Tells every agent the repo loop.
layer: prose
takes: [repo-loop]
---
# repo

| Rule | Enforced by |
|---|---|
| No git clean | `scripts/guard.mjs` |
| No .only in tests | `scripts/check.mjs` rule `no-only`; pre-commit hook |
| Findings need evidence | prose only |
