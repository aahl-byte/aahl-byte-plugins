// Records the data-changing requests pages send during e2e tests, with the door that signed each, for the cleanup report.
// Report-only: nothing here can fail a test.
import fs from "node:fs";
import path from "node:path";

export interface DoorRequest {
  method: string;
  path: string;
  door: string | null;
  spec: string;
  test: string;
  count: number;
}

export interface RequestData {
  method: string;
  url: string;
  headers: Record<string, string>;
  postData?: string | null;
}

interface RequestLike {
  method(): string;
  url(): string;
  headers(): Record<string, string>;
  postData(): string | null;
}

interface ContextLike {
  on(event: "request", listener: (request: RequestLike) => void): unknown;
  off(event: "request", listener: (request: RequestLike) => void): unknown;
}

const DATA_CHANGING = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^(?=.*\d)[A-Za-z0-9_-]{20,}$/;
// A server action signed with signAction carries { door } as its first bound argument.
const BOUND_DOOR = /"door"\s*:\s*"([^"]+)"/;

export const DEFAULT_LOG_DIR = path.resolve("test-results", "door-requests");

export function isDataChanging(method: string): boolean {
  return DATA_CHANGING.has(method.toUpperCase());
}

/** Ids and tokens in a path become :id and :token, so one endpoint is one entry. */
export function templatePath(pathname: string): string {
  return pathname
    .split("?")[0]
    .split("/")
    .map((seg) => (/^\d+$/.test(seg) || UUID.test(seg) ? ":id" : TOKEN.test(seg) ? ":token" : seg))
    .join("/");
}

function lowerKeys(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
}

/** Adds one request to the log, merging repeats. Ignores reads and, given an origin, other sites. */
export function recordRequest(
  log: Map<string, DoorRequest>,
  request: RequestData,
  where: { spec: string; test: string },
  origin?: string
): boolean {
  if (!isDataChanging(request.method)) return false;
  let url: URL;
  try {
    url = new URL(request.url);
  } catch {
    return false;
  }
  if (origin && url.origin !== new URL(origin).origin) return false;
  const headers = lowerKeys(request.headers);
  const action = headers["next-action"];
  let door = headers["x-door"] ?? null;
  if (!door && action) door = BOUND_DOOR.exec(request.postData ?? "")?.[1] ?? null;
  const method = request.method.toUpperCase();
  const route = templatePath(url.pathname) + (action ? ` [action ${action}]` : "");
  const key = [method, route, door ?? "", where.spec, where.test].join("\u0000");
  const seen = log.get(key);
  if (seen) seen.count += 1;
  else log.set(key, { method, path: route, door, spec: where.spec, test: where.test, count: 1 });
  return true;
}

/** Writes this worker's log as {"version":1,"requests":[...]} and returns the file. */
export function writeRequestLog(dir: string, log: Map<string, DoorRequest>, worker: string): string {
  fs.mkdirSync(dir, { recursive: true });
  const requests = [...log.values()].sort(
    (a, b) =>
      a.method.localeCompare(b.method) ||
      a.path.localeCompare(b.path) ||
      (a.door ?? "").localeCompare(b.door ?? "") ||
      a.spec.localeCompare(b.spec) ||
      a.test.localeCompare(b.test)
  );
  const file = path.join(dir, `worker-${worker}.json`);
  fs.writeFileSync(file, JSON.stringify({ version: 1, requests }, null, 2) + "\n");
  return file;
}

const workerLog = new Map<string, DoorRequest>();

/** The body of an auto fixture: records the context's data-changing requests while the test runs. */
export async function recordDoorRequests(
  { context, baseURL }: { context: ContextLike; baseURL?: string },
  use: () => Promise<void>,
  testInfo: { file: string; title: string },
  dir: string = DEFAULT_LOG_DIR
): Promise<void> {
  const where = { spec: path.relative(process.cwd(), testInfo.file), test: testInfo.title };
  const listener = (request: RequestLike) => {
    try {
      recordRequest(workerLog, { method: request.method(), url: request.url(), headers: request.headers(), postData: request.postData() }, where, baseURL);
    } catch {
      // A request the log can't read is left out.
    }
  };
  context.on("request", listener);
  try {
    await use();
  } finally {
    context.off("request", listener);
    try {
      writeRequestLog(dir, workerLog, String(process.pid));
    } catch {
      // The log is a report; a write failure must not fail the test.
    }
  }
}
