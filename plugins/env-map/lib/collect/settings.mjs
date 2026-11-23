// Parses a settings.json (any level) or a plugin hooks.json into hook and deny-rule boxes.
import path from "node:path";
import { permissionPattern } from "../text.mjs";

const SCRIPT = /(?:^|[\s"'=(;])((?:\/|\.{1,2}\/)?[\w.@+-]+(?:\/[\w.@+-]+)*\.(?:mjs|cjs|js|ts|py|sh|bash|rb|pl))(?=$|[\s"';)&|])/g;
const SHELL_STOP = /[;&|>)]/;

function substitute(command, vars) {
  let s = command;
  for (const [k, v] of Object.entries(vars)) {
    if (v) s = s.replaceAll(`\${${k}}`, v).replace(new RegExp(`\\$${k}(?![A-Za-z0-9_])`, "g"), v);
  }
  return s.replace(/(^|[\s"'=(])~\//g, `$1${vars.HOME}/`);
}

/** Absolute paths of the script files a hook or git hook command runs, in order of appearance. */
export function calledFiles(command, vars, baseDir) {
  const s = substitute(command, vars);
  const out = [];
  for (const m of s.matchAll(SCRIPT)) {
    const file = path.resolve(baseDir, m[1]);
    if (!out.includes(file)) out.push(file);
  }
  return out;
}

/** The script name plus the first two arguments it is given, or the start of an inline command. */
export function commandLabel(command, file, vars) {
  if (!file) return command.length > 40 ? `${command.slice(0, 39)}…` : command;
  const s = substitute(command, vars);
  const markers = [file, path.relative(vars.CLAUDE_PROJECT_DIR ?? "", file), '"$f"', "$f"];
  let at = -1;
  let len = 0;
  for (const m of markers) {
    const i = m ? s.lastIndexOf(m) : -1;
    if (i > at) {
      at = i;
      len = m.length;
    }
  }
  const args = [];
  if (at >= 0) {
    for (const tok of s.slice(at + len).replace(/^["']/, "").trim().split(/\s+/)) {
      if (!tok || SHELL_STOP.test(tok) || args.length === 2) break;
      args.push(tok);
    }
  }
  return [path.basename(file), ...args].join(" ");
}

export function parseSettings({ text, sourceId, vars, baseDir }) {
  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { boxes: [], edges: [], calls: [], error: `invalid JSON: ${e.message}` };
  }
  const boxes = [];
  const edges = [];
  const calls = [];
  for (const [event, groups] of Object.entries(json.hooks ?? {})) {
    (Array.isArray(groups) ? groups : []).forEach((group, i) => {
      (group.hooks ?? []).forEach((hook, j) => {
        const id = `hook:${sourceId}:${event}:${i}.${j}`;
        const command = hook.type === "command" ? String(hook.command ?? "") : "";
        const files = command ? calledFiles(command, vars, baseDir) : [];
        boxes.push({
          id,
          kind: "hook",
          event,
          matcher: group.matcher ?? "",
          command: command || `${hook.type} hook`,
          inline: files.length === 0,
          label: command ? commandLabel(command, files[0], vars) : `${hook.type} hook`,
          source: sourceId,
        });
        edges.push({ from: `event:${event}`, to: id, kind: "fires" });
        for (const file of files) calls.push({ from: id, file });
      });
    });
  }
  for (const rule of json.permissions?.deny ?? []) {
    const id = `deny:${sourceId}:${rule}`;
    boxes.push({ id, kind: "deny", label: `deny ${rule}`, event: "PreToolUse", pattern: permissionPattern(rule), source: sourceId });
    edges.push({ from: "event:PreToolUse", to: id, kind: "fires" });
  }
  return { boxes, edges, calls, enabledPlugins: json.enabledPlugins ?? {} };
}
