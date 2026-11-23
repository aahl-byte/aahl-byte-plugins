export const meta = { why: "One gate for every change.", layer: "check", takes: ["repo-rules"] };
const RULES = [
  { id: "no-only", why: "A focused test skips the rest.", run: () => [] },
];
