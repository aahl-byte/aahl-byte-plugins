// Turns a flag's pattern into what matches it: an esquery selector for source kinds, a matcher for imports and endpoints.

const TAG = /^[a-z][a-z0-9-]*$/;
const ATTR = /^([A-Za-z][\w-]*)(?:="([^"]*)")?$/;
const IDENT = /^[A-Za-z_$][\w$]*$/;

const quote = (s) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

/**
 * The esquery selector for an element, property or action flag. Shorthands:
 * element `input` means a lowercase <input>; property `onClick` or `role="button"` means that
 * attribute on a lowercase element; action `createFinding` means any call to that name.
 * Anything else is taken as a selector already.
 */
export function selectorFor(flag) {
  const p = flag.pattern.trim();
  if (flag.kind === "element" && TAG.test(p)) return `JSXOpeningElement[name.name=${quote(p)}]`;
  if (flag.kind === "property") {
    const m = ATTR.exec(p);
    if (m) {
      const value = m[2] === undefined ? "" : `[value.value=${quote(m[2])}]`;
      return `JSXOpeningElement[name.name=/^[a-z]/] > JSXAttribute[name.name=${quote(m[1])}]${value}`;
    }
  }
  if (flag.kind === "action" && IDENT.test(p)) return `CallExpression[callee.name=${quote(p)}], CallExpression[callee.property.name=${quote(p)}]`;
  return p;
}

/** A label for messages: `<input>`, `onClick`, `@radix-ui/*`, `createFinding()`, `POST /api/findings`. */
export function labelFor(flag) {
  if (flag.label) return flag.label;
  const p = flag.pattern.trim();
  if (flag.kind === "element" && TAG.test(p)) return `<${p}>`;
  if (flag.kind === "action" && IDENT.test(p)) return `${p}()`;
  return p;
}

function globToRegExp(glob) {
  const body = glob
    .split("*")
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}$`);
}

/** Matches a module specifier against an import flag's glob, e.g. `@radix-ui/*` or `react-hook-form`. */
export function importMatcher(pattern) {
  const re = globToRegExp(pattern.trim());
  return (specifier) => re.test(specifier);
}

/**
 * Matches "<METHOD> <path>" against an endpoint flag. In the flag's path, `*` and `:name` match one
 * segment and a trailing `**` matches the rest.
 */
export function endpointMatcher(pattern) {
  const [method, route] = pattern.trim().split(/\s+/);
  const want = route.split("/").filter(Boolean);
  return (reqMethod, reqPath) => {
    if (reqMethod.toUpperCase() !== method.toUpperCase()) return false;
    const got = reqPath.split("?")[0].split("/").filter(Boolean);
    for (let i = 0; i < want.length; i++) {
      if (want[i] === "**") return true;
      if (i >= got.length) return false;
      if (want[i] === "*" || want[i].startsWith(":")) continue;
      if (want[i] !== got[i]) return false;
    }
    return got.length === want.length;
  };
}
