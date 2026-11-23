# agent-tools

Agent sessions run with no Bash tool. Each role gets a few built-in file tools and a set of typed MCP tools, and each tool runs one fixed program with an argv array built from its typed input. A tool's limits live in its own file, so no guard script has to patch shell commands one rule at a time.

```
/plugin install agent-tools --marketplace aahl-byte/aahl-byte-plugins
```

## Run a session

```
agent-tools run --role dev --cwd <worktree> --model haiku --effort low -- "<prompt>"
```

The launcher runs `claude` in `<worktree>` with:

```
claude -p --tools Read,Edit,Write,Grep,Glob --strict-mcp-config --mcp-config '<role servers>' \
  --allowedTools Read,Edit,Write,Grep,Glob,mcp__dev__Test,... --permission-mode dontAsk --model haiku --effort low "<prompt>"
```

`--tools` limits the built-in tools to the role's list, so Bash is never loaded. `--strict-mcp-config` drops every MCP server but the role's own. `dontAsk` denies anything `--allowedTools` doesn't name. Arguments after `--` go to `claude` unchanged, such as `--output-format stream-json` or `--max-budget-usd 1`. `--dry-run` prints the command instead of running it. `agent-tools roles` and `agent-tools tools` list what exists.

On first use the launcher installs the MCP SDK and zod from the pinned lockfile (`npm ci`).

## Roles

| Role | Built-in | MCP tools |
|---|---|---|
| `dev` | Read, Edit, Write, Grep, Glob | Test, Check, Git_Status, Git_Diff, Todo_Get, Todo_List, Todo_Note, Todo_Log, RequestTool |
| `verify` | Read, Grep, Glob | Test, Check, Git_Status, Git_Diff, E2E, Todo_Get, Todo_List, RequestTool, the Playwright browser tools |
| `ops` | Read, Grep, Glob | every todo tool, every jira tool, every wt-session tool, RequestTool |

A role is a JSON file in `roles/`. Each MCP server starts with `--only <its tools>`, so a tool the role lacks is never listed to the model.

No preset includes `db-request` or `explore-db`. To grant them, add a role file naming the server, e.g. `"db-request": ["DbRequest_Status", "DbRequest_Lint"]`.

### Browser tools in verify

`verify` reuses the official Playwright plugin. The launcher reads that plugin's `.mcp.json` (`~/.claude/plugins/marketplaces/claude-plugins-official/external_plugins/playwright`), appends `--headless --isolated --allowed-origins http://localhost:<port>`, and tells the session the app's URL. The port comes from the project config's `e2e.port` command. The browser expects the app to be running on that port already: start it in the harness before launching `verify`. `--allowed-origins` keeps the browser on that app; Playwright documents it as a guard rail, not a security boundary.

## Project config

Each repo states its own commands in `.claude/agent-tools.json`. A worktree without the file uses the main checkout's. Example for inspection-app, in `examples/inspection-app.agent-tools.json`:

```json
{
  "gate": ["npm", "run", "check"],
  "test": {
    "run": ["npx", "vitest", "run"],
    "related": ["npx", "vitest", "related", "--run"]
  },
  "e2e": {
    "run": ["npx", "playwright", "test", "-c", "e2e/playwright.config.ts"],
    "specDir": "e2e",
    "projects": ["phone", "tablet", "sso", "mail-fail"],
    "portEnv": "E2E_PORT",
    "port": ["node", "scripts/wt.mjs", "port", "{worktree}"]
  }
}
```

`{worktree}` is the worktree folder's name and `{cwd}` its path. Test adds `--reporter=json` to the vitest command; E2E adds `--reporter=json`, the project and the spec, and sets `portEnv` to the port.

## Output and the ledger

Every tool returns a status line, then failures, then anything else, cut at 200 lines or 24 KB with a note saying how much was cut. Test and E2E return failures only, each as `file:line`, test name and message. Connection strings, URL credentials, tokens and `*_PASSWORD=`-style values are redacted from all output.

Every call appends one JSON line to `$AGENT_TOOLS_LEDGER` (default `~/.local/state/agent-tools/ledger.jsonl`):

```json
{"ts":"…","role":"dev","server":"dev","tool":"Test","args":{"files":["e2e/a.test.ts"]},"exit":1,"ms":5210,"cwd":"…"}
```

`RequestTool({ why, what })` runs nothing and returns `recorded`. Its ledger line is how a missing tool shows up: count the `RequestTool` lines to decide what to build next.

## Add a tool

Drop one file in `servers/<server>/`. The file exports env-map's `meta` and a `defineTool` default:

```js
import { z } from "zod";
import { arg, defineTool } from "../../lib/tool.mjs";

export const meta = { why: "…", layer: "type", takes: ["read-git-state"] };

export default defineTool({
  name: "Git_Log",
  description: "…",
  input: { path: arg("a path relative to the repo root").optional() },
  meta,
  readOnly: true,
  command: ({ path }) => ({ program: "git", args: ["--no-pager", "log", "--oneline", "-20", ...(path ? ["--", path] : [])] }),
});
```

- `command` returns `{ program, args, stdin?, env?, cwd?, timeoutMs? }`. It never runs a shell. Put user text after `--`, in `--flag=value`, or on `stdin`; `arg()` refuses values that start with a dash.
- `shape(result, input, ctx)` is optional and returns `{ status, failures, lines }`.
- `readOnly` and `outward` mark reads and outward-facing writes. Keep reads and writes in separate tools so a role can be granted one without the other.
- `takes` ids must be in `plugins/env-map/responsibilities.yaml`. `npm test` checks the meta with env-map's own parser and every tool's argv, including that `; rm -rf /` stays one literal argument.

## What each server leaves out

- **todo:** every lifecycle verb past review (done, QA, deploy, cancel, block), `set`, `add`, `archive`, `sync`, `link`, `connection`, `plugin`, `action`. `task` covers add, start, review and done.
- **jira:** `create:ticket` and `create:epic` (made only when the user says so), labels, worklog, assignee, priority, parent, `init`, `test`.
- **wt-session:** `new`, `stop`, `schedule`, the local-model verbs, and `send --as-user`, which speaks with the user's authority.
- **explore-db:** `config`, `password`, `token` (they handle credentials), `--file`, and the whole-schema dump and DDL.
- **db-request:** `deploy`, `drain`, `init`, `land`, `ready`, `record`, `rehearse`, `reclassify`, `pull`, `withdraw`, `ticket`, `upgrade`.
- **plugin-scripts:** dev-kernel's `init.sh` (a person runs it once to install scripts into a project) and `launch.ts` (it opens a terminal window for a person); env-map `map` (its SessionStart hook draws the page for a person).
