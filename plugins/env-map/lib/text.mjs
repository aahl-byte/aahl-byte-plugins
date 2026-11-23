// Reads the facts env-map needs out of markdown and script text, without running any of it.
import vm from "node:vm";

const JS_EXT = new Set([".mjs", ".js", ".cjs", ".ts"]);

function unquote(value) {
  const v = value.trim();
  if (v.startsWith('"') && v.endsWith('"') && v.length > 1) {
    try {
      return JSON.parse(v);
    } catch {
      return v.slice(1, -1);
    }
  }
  if (v.startsWith("'") && v.endsWith("'") && v.length > 1) return v.slice(1, -1).replace(/''/g, "'");
  return v;
}

function scalar(value) {
  const v = value.trim();
  if (v === "true") return true;
  if (v === "false") return false;
  if (v.startsWith("[") && v.endsWith("]")) {
    return v
      .slice(1, -1)
      .split(",")
      .map((s) => unquote(s))
      .filter((s) => s !== "");
  }
  return unquote(v);
}

/** Top-level frontmatter keys: scalars, flow lists, block lists and block scalars. Nested maps are skipped. */
export function parseFrontmatter(md) {
  const text = md.replace(/^﻿/, "");
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  if (!m) return { data: {}, body: text };
  const lines = m[1].split(/\r?\n/);
  const data = {};
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([A-Za-z0-9_-]+):[ \t]*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    const [, key, raw] = kv;
    const nested = [];
    while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || /^-\s/.test(lines[i + 1]) || lines[i + 1].trim() === "")) {
      nested.push(lines[++i]);
    }
    const items = nested.filter((l) => l.trim() !== "");
    if (raw === "" && items.length && items.every((l) => /^\s*-\s/.test(l))) {
      data[key] = items.map((l) => unquote(l.replace(/^\s*-\s/, "")));
    } else if (/^[>|][-+]?$/.test(raw)) {
      data[key] = items.map((l) => l.trim()).join(raw.startsWith(">") ? " " : "\n");
    } else if (raw !== "") {
      data[key] = scalar(raw);
    }
  }
  return { data, body: text.slice(m[0].length) };
}

const REGEX_AFTER = new Set(["", "(", ",", "=", ":", "[", "!", "&", "|", "?", "{", "}", ";", "+", "-", "*", "%", "<", ">", "~", "^"]);

function skipQuoted(src, i) {
  const q = src[i];
  i++;
  while (i < src.length) {
    const c = src[i];
    if (c === "\\") i += 2;
    else if (c === q) return i + 1;
    else if (q === "`" && c === "$" && src[i + 1] === "{") i = balancedEnd(src, i + 1);
    else i++;
  }
  return i;
}

function skipRegex(src, i) {
  i++;
  let inClass = false;
  while (i < src.length) {
    const c = src[i];
    if (c === "\\") i += 2;
    else if (c === "\n") return i;
    else if (inClass) {
      if (c === "]") inClass = false;
      i++;
    } else if (c === "[") {
      inClass = true;
      i++;
    } else if (c === "/") {
      i++;
      while (/[a-z]/i.test(src[i] ?? "")) i++;
      return i;
    } else i++;
  }
  return i;
}

/** Yields each code token: single punctuation/word characters, or whole strings, regex literals. Comments are skipped. */
function* tokens(src, start = 0) {
  let i = start;
  let prev = "";
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === "/" && n === "/") {
      const e = src.indexOf("\n", i);
      if (e < 0) return;
      i = e;
      continue;
    }
    if (c === "/" && n === "*") {
      const e = src.indexOf("*/", i + 2);
      if (e < 0) return;
      i = e + 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const end = skipQuoted(src, i);
      yield { i, end, kind: "string" };
      prev = "a";
      i = end;
      continue;
    }
    if (c === "/" && REGEX_AFTER.has(prev)) {
      const end = skipRegex(src, i);
      yield { i, end, kind: "regex" };
      prev = "a";
      i = end;
      continue;
    }
    if (!/\s/.test(c)) {
      yield { i, end: i + 1, kind: "code", c };
      prev = c;
    }
    i++;
  }
}

const OPEN = "([{";
const CLOSE = ")]}";

/** Index just past the bracket matching the one at openIdx. */
function balancedEnd(src, openIdx) {
  let depth = 0;
  for (const t of tokens(src, openIdx)) {
    if (t.kind !== "code") continue;
    if (OPEN.includes(t.c)) depth++;
    else if (CLOSE.includes(t.c) && --depth === 0) return t.end;
  }
  return src.length;
}

/** The top-level comma-separated pieces inside the bracket pair starting at openIdx. */
function splitTopLevel(src, openIdx) {
  const end = balancedEnd(src, openIdx) - 1;
  const parts = [];
  let depth = 0;
  let from = openIdx + 1;
  for (const t of tokens(src, openIdx + 1)) {
    if (t.i >= end) break;
    if (t.kind !== "code") continue;
    if (OPEN.includes(t.c)) depth++;
    else if (CLOSE.includes(t.c)) depth--;
    else if (t.c === "," && depth === 0) {
      parts.push(src.slice(from, t.i));
      from = t.end;
    }
  }
  parts.push(src.slice(from, end));
  return parts.map((p) => p.trim()).filter(Boolean);
}

function evalLiteral(text) {
  try {
    return vm.runInNewContext(`(${text})`, Object.create(null), { timeout: 50 });
  } catch {
    return undefined;
  }
}

function plainMeta(value) {
  if (!value || typeof value !== "object") return {};
  const out = {};
  if (typeof value.why === "string") out.why = value.why;
  if (typeof value.layer === "string") out.layer = value.layer;
  if (Array.isArray(value.takes)) out.takes = Array.from(value.takes).filter((t) => typeof t === "string");
  return out;
}

/** why, layer and takes from `export const meta = {...}` in JS, or from `# why:` style header comments elsewhere. */
export function scriptMeta(src, ext) {
  if (JS_EXT.has(ext)) {
    const m = /export\s+const\s+meta\s*=\s*\{/.exec(src);
    if (!m) return {};
    const open = m.index + m[0].length - 1;
    return plainMeta(evalLiteral(src.slice(open, balancedEnd(src, open))));
  }
  const out = {};
  for (const line of src.split(/\r?\n/).slice(0, 30)) {
    const h = /^\s*(?:#|\/\/)\s*(why|layer|takes):\s*(.+?)\s*$/.exec(line);
    if (!h) continue;
    out[h[1]] = h[1] === "takes" ? h[2].split(",").map((s) => s.trim()).filter(Boolean) : h[2];
  }
  return out;
}

function properties(objText) {
  const props = {};
  for (const piece of splitTopLevel(objText, 0)) {
    const m = /^(?:"([^"]+)"|'([^']+)'|([A-Za-z_$][\w$]*))\s*:\s*([\s\S]*)$/.exec(piece);
    if (m) props[m[1] ?? m[2] ?? m[3]] = m[4].trim();
  }
  return props;
}

function regexLiteral(raw) {
  const m = /^\/([\s\S]*)\/([a-z]*)$/.exec(raw);
  return m ? { source: m[1], flags: m[2] } : null;
}

/** The objects in a top-level `const RULES = [...]`: id, why, layer, takes and the `match` regex. */
export function scriptRules(src) {
  const m = /\b(?:const|let|var)\s+RULES\s*=\s*\[/.exec(src);
  if (!m) return [];
  const open = m.index + m[0].length - 1;
  return splitTopLevel(src, open)
    .filter((el) => el.startsWith("{"))
    .map((el, index) => {
      const props = properties(el);
      const rule = { index };
      if (props.id) {
        const id = evalLiteral(props.id);
        if (typeof id === "string") rule.id = id;
      }
      const meta = { ...plainMeta(evalLiteral(props.meta ?? "null")) };
      for (const key of ["why", "layer", "takes"]) {
        if (props[key] !== undefined) Object.assign(meta, plainMeta({ [key]: evalLiteral(props[key]) }));
      }
      Object.assign(rule, meta);
      const re = props.match ? regexLiteral(props.match) : null;
      if (re) rule.pattern = { ...re, sample: regexSample(re.source, re.flags) };
      return rule;
    });
}

const ESCAPES = { s: " ", S: "x", d: "0", D: "x", w: "a", W: "-", n: "\n", t: "\t", r: "\r", b: "", B: "" };

/** A short string the regex matches, built by taking the first branch and the fewest repeats; null when unsure. */
export function regexSample(source, flags) {
  let pos = 0;
  const peek = () => source[pos];
  function alt() {
    const first = seq();
    while (peek() === "|") {
      pos++;
      seq();
    }
    return first;
  }
  function seq() {
    let out = "";
    while (pos < source.length && peek() !== "|" && peek() !== ")") {
      let piece = atom();
      if (piece === null) return null;
      const q = peek();
      if (q === "*" || q === "?") {
        pos++;
        piece = "";
      } else if (q === "+") pos++;
      else if (q === "{") {
        const r = /^\{(\d+)(,\d*)?\}/.exec(source.slice(pos));
        if (r) {
          pos += r[0].length;
          piece = piece.repeat(Number(r[1]));
        }
      }
      if (peek() === "?") pos++;
      if (out === null) return null;
      out += piece;
    }
    return out;
  }
  function atom() {
    const c = source[pos++];
    if (c === "\\") {
      const e = source[pos++];
      return e in ESCAPES ? ESCAPES[e] : e;
    }
    if (c === "^" || c === "$") return "";
    if (c === ".") return "x";
    if (c === "[") {
      const end = source.indexOf("]", pos + 1);
      const body = source.slice(pos, end);
      pos = end + 1;
      if (body.startsWith("^")) return "x";
      if (body.startsWith("\\")) return ESCAPES[body[1]] ?? body[1];
      return body[0];
    }
    if (c === "(") {
      if (source.startsWith("?:", pos)) pos += 2;
      else if (/^\?<[A-Za-z]/.test(source.slice(pos))) pos = source.indexOf(">", pos) + 1;
      else if (source[pos] === "?") return null;
      const inner = alt();
      pos++;
      return inner;
    }
    return c;
  }
  try {
    const sample = alt();
    if (sample === null || pos < source.length) return null;
    return new RegExp(source, flags).test(sample) ? sample : null;
  } catch {
    return null;
  }
}

const escapeRe = (s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

/** A permission rule such as `Bash(rm *)` as a tool plus the regex its content matches. */
export function permissionPattern(rule) {
  const m = /^([^(]+)(?:\((.*)\))?$/.exec(rule.trim());
  const tool = m ? m[1] : rule;
  const content = m?.[2];
  if (content === undefined) return { tool, source: "^.*$", flags: "", sample: "x" };
  const prefix = /^(.*):\*$/.exec(content);
  if (prefix) return { tool, source: `^${escapeRe(prefix[1])}\\b.*$`, flags: "", sample: prefix[1] };
  const source = `^${content.split("*").map(escapeRe).join(".*")}$`;
  return { tool, source, flags: "", sample: content.replaceAll("*", "x") };
}
