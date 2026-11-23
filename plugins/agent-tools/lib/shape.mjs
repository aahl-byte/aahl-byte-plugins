// Turns raw program output into what an agent needs: a status line, failures first, then the rest, under a size cap.
import path from "node:path";

export const DEFAULT_CAP = { maxLines: 200, maxBytes: 24_000 };

const ANSI = /\u001b\[[0-9;?]*[A-Za-z]/g;

export function lines(text) {
  const out = (text ?? "").replace(ANSI, "").replace(/\r\n?/g, "\n").replace(/\s+$/, "").split("\n");
  return out.length === 1 && out[0] === "" ? [] : out;
}

export function render({ status, failures = [], lines: rest = [] }, cap = {}) {
  const { maxLines, maxBytes } = { ...DEFAULT_CAP, ...cap };
  const all = [status];
  if (failures.length) all.push("", `failures (${failures.length}):`, ...failures.flatMap((f) => f.split("\n")));
  if (rest.length) all.push("", ...rest.flatMap((l) => l.split("\n")));
  const kept = [];
  let bytes = 0;
  for (const line of all) {
    if (kept.length >= maxLines || bytes >= maxBytes) break;
    let l = line;
    if (bytes + Buffer.byteLength(l) > maxBytes) l = `${l.slice(0, Math.max(0, maxBytes - bytes))} [cut at ${maxBytes} bytes]`;
    kept.push(l);
    bytes += Buffer.byteLength(l) + 1;
  }
  const cut = all.length - kept.length;
  if (cut > 0) kept.push(`[cut ${cut} more lines; narrow the request to see them]`);
  return kept.join("\n");
}

const REDACTIONS = [
  [/\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|rediss|amqps?|mssql|sqlserver):\/\/\S+/gi, "[redacted connection string]"],
  [/\b([a-z][a-z0-9+.-]*:\/\/)[^\s/:@]+:[^\s/@]+@/gi, "$1[redacted]@"],
  [/\b(Bearer|Basic|Token)\s+[A-Za-z0-9._~+/=-]{8,}/g, "$1 [redacted]"],
  [/\b(ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{6,}/g, "[redacted token]"],
  [/\bsk-[A-Za-z0-9_-]{6,}/g, "[redacted token]"],
  [/\bxox[abposr]-[A-Za-z0-9-]{6,}/g, "[redacted token]"],
  [/\bATATT[A-Za-z0-9_=-]{6,}/g, "[redacted token]"],
  [/\bAKIA[0-9A-Z]{16}\b/g, "[redacted token]"],
  [/^(\s*(?:export\s+)?[A-Z0-9_]*(?:PASSWORD|PASSWD|SECRET|TOKEN|API_KEY|APIKEY|PRIVATE_KEY|ACCESS_KEY|DATABASE_URL|DATABASE_URI|_DSN)[A-Z0-9_]*\s*[=:]\s*)(?!\[redacted).+$/gm, "$1[redacted]"],
  [/\b(password|passwd|pwd|secret|api[_-]?key|access[_-]?token|client[_-]?secret)\b(\s*[:=]\s*)(?!\[redacted)(["']?)[^\s"',;()]{4,}\3/gi, "$1$2[redacted]"],
];

/** Hides connection strings, URL credentials and secret-looking values from anything a tool returns. */
export function redact(text) {
  let out = text;
  for (const [re, to] of REDACTIONS) out = out.replace(re, to);
  return out;
}

/** The lines of an error message before its stack, blank lines dropped, at most `max`. */
function messageHead(message, max = 6) {
  const out = [];
  for (const l of lines(message)) {
    if (/^\s+at\s/.test(l)) break;
    if (l.trim() === "") continue;
    out.push(l.trim());
    if (out.length >= max) break;
  }
  return out;
}

const indent = (ls) => ls.map((l) => `  ${l}`).join("\n");
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function lineIn(message, file) {
  const m = new RegExp(`${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:(\\d+):\\d+`).exec(message ?? "");
  return m ? Number(m[1]) : undefined;
}

/** A vitest JSON report reduced to its failures, each as file:line title and the assertion message. */
export function vitestReport(report, cwd) {
  const failures = [];
  let loadErrors = 0;
  for (const file of report.testResults ?? []) {
    const rel = path.relative(cwd, file.name);
    const failed = (file.assertionResults ?? []).filter((a) => a.status === "failed");
    if (file.status === "failed" && failed.length === 0) {
      loadErrors++;
      const [first = "failed", ...more] = messageHead(file.message || "failed with no message");
      failures.push(`${rel}: failed to load: ${first}${more.length ? `\n${indent(more)}` : ""}`);
    }
    for (const a of failed) {
      const message = a.failureMessages?.[0] ?? "";
      const line = lineIn(message, file.name) ?? a.location?.line;
      const title = [...(a.ancestorTitles ?? []), a.title].join(" > ");
      const head = messageHead(message);
      failures.push(`${rel}${line ? `:${line}` : ""} ${title}${head.length ? `\n${indent(head)}` : ""}`);
    }
  }
  let status = `Test: ${report.numFailedTests ?? 0} failed, ${report.numPassedTests ?? 0} passed`;
  if (loadErrors) status += `, ${plural(loadErrors, "file", "files")} failed to load`;
  return { status, failures, lines: [] };
}

/** A Playwright JSON report reduced to its failed and flaky tests, each with file:line, project and error. */
export function playwrightReport(report, cwd) {
  const rootDir = report.config?.rootDir ?? cwd;
  const rel = (f) => path.relative(cwd, path.isAbsolute(f) ? f : path.join(rootDir, f));
  const failures = [];
  const walk = (suite, titles) => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        if (t.status !== "unexpected" && t.status !== "flaky") continue;
        const bad = (t.results ?? []).find((r) => r.error || r.errors?.length);
        const error = bad?.error ?? bad?.errors?.[0];
        const where = error?.location ? `${rel(error.location.file)}:${error.location.line}` : `${rel(spec.file)}:${spec.line}`;
        const title = [...titles, spec.title].join(" > ");
        const note = t.status === "flaky" ? " (flaky: passed on retry)" : "";
        const head = messageHead(error?.message ?? "");
        failures.push(`${where} [${t.projectName}] ${title}${note}${head.length ? `\n${indent(head)}` : ""}`);
      }
    }
    for (const child of suite.suites ?? []) walk(child, [...titles, child.title]);
  };
  for (const fileSuite of report.suites ?? []) walk(fileSuite, []);
  for (const e of report.errors ?? []) {
    const where = e.location ? `${rel(e.location.file)}:${e.location.line} ` : "";
    failures.push(`${where}error outside any test\n${indent(messageHead(e.message ?? String(e)))}`);
  }
  const s = report.stats ?? {};
  const status = `E2E: ${s.unexpected ?? 0} failed, ${s.flaky ?? 0} flaky, ${s.expected ?? 0} passed, ${s.skipped ?? 0} skipped`;
  return { status, failures, lines: [] };
}

/** Any command: stderr is the failure when it exits non-zero; stdout is the rest. */
export function commandReport(name, result) {
  if (result.timedOut) return { status: `${name}: timed out`, failures: lines(result.stderr), lines: lines(result.stdout).slice(-40) };
  if (result.error && result.exit === null) return { status: `${name}: could not start: ${result.error}`, failures: [], lines: [] };
  if (result.exit === 0) return { status: `${name}: ok`, failures: [], lines: lines(result.stdout) };
  const status = `${name}: failed (exit ${result.exit ?? result.signal})`;
  const out = lines(result.stdout);
  if (lines(result.stderr).length) return { status, failures: lines(result.stderr), lines: out };
  const isFailure = (l) => /^\s*(FAIL|ERROR|error|✗|✖)\b/.test(l);
  return { status, failures: out.filter(isFailure), lines: out.filter((l) => !isFailure(l)) };
}
