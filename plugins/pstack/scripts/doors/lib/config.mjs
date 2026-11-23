// A repo's door settings (doors/config.json) and flag registry (doors/flags.json), with each flag's shape checked.
import fs from "node:fs";
import path from "node:path";

export const CONFIG_FILE = "doors/config.json";
export const FLAGS_FILE = "doors/flags.json";
export const KINDS = ["element", "property", "import", "action", "endpoint"];
export const SOURCE_KINDS = ["element", "property", "import", "action"];

export const DEFAULT_CONFIG = {
  helper: "src/lib/doors.ts",
  signers: ["signOutput", "signRequest", "signAction"],
  doorFolders: [],
  sources: ["src"],
  extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
  ignore: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx", "**/*.d.ts"],
  rawElements: ["button", "input", "select", "textarea", "a"],
  requestLog: null,
};

const ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    throw new Error(`${file}: ${e.code === "ENOENT" ? "missing" : e.message}`);
  }
}

/** Door folders as { path, why }; a bare string is a folder with no stated purpose. */
function normalizeFolders(folders) {
  return (folders ?? []).map((f) => (typeof f === "string" ? { path: f, why: null } : { path: f.path, why: f.why ?? null }));
}

export function validateFlag(flag, index = 0) {
  const at = `flags[${index}]${flag?.id ? ` (${flag.id})` : ""}`;
  const errors = [];
  if (!flag || typeof flag !== "object") return [`${at}: must be an object`];
  if (!ID.test(flag.id ?? "")) errors.push(`${at}: id must be kebab-case`);
  if (!KINDS.includes(flag.kind)) errors.push(`${at}: kind must be one of ${KINDS.join(", ")}`);
  if (typeof flag.pattern !== "string" || !flag.pattern.trim()) errors.push(`${at}: pattern must be a non-empty string`);
  if (typeof flag.why !== "string" || !flag.why.trim()) errors.push(`${at}: why must say in one line what the flag protects`);
  if (!Array.isArray(flag.questions) || flag.questions.length === 0 || flag.questions.some((q) => typeof q !== "string" || !q.trim())) {
    errors.push(`${at}: questions must hold at least one probing question`);
  }
  if (flag.authorities !== undefined) {
    if (!Array.isArray(flag.authorities)) errors.push(`${at}: authorities must be an array`);
    else
      flag.authorities.forEach((a, i) => {
        if (!a || typeof a.door !== "string" || !a.door.trim()) errors.push(`${at}: authorities[${i}].door must name the door`);
        else if (!a.file && !a.why) errors.push(`${at}: authorities[${i}] (${a.door}) needs a file or a why`);
      });
  }
  if (flag.kind === "endpoint" && typeof flag.pattern === "string" && !/^(GET|POST|PUT|PATCH|DELETE)\s+\/\S*$/.test(flag.pattern)) {
    errors.push(`${at}: an endpoint pattern is "<METHOD> /path", e.g. "POST /api/findings/:id"`);
  }
  return errors;
}

/** Reads both files; a missing flags file means no flags yet. Errors are returned, not thrown, so a report can still run. */
export function loadDoors(repo) {
  const errors = [];
  let raw = {};
  const configFile = path.join(repo, CONFIG_FILE);
  if (fs.existsSync(configFile)) {
    try {
      raw = readJson(configFile);
    } catch (e) {
      errors.push(e.message);
    }
  }
  const config = { ...DEFAULT_CONFIG, ...raw, doorFolders: normalizeFolders(raw.doorFolders) };
  let flags = [];
  const flagsFile = path.join(repo, FLAGS_FILE);
  if (fs.existsSync(flagsFile)) {
    try {
      const data = readJson(flagsFile);
      flags = Array.isArray(data) ? data : (data.flags ?? []);
    } catch (e) {
      errors.push(e.message);
    }
  }
  const seen = new Set();
  const valid = [];
  flags.forEach((flag, i) => {
    const errs = validateFlag(flag, i);
    if (flag?.id && seen.has(flag.id)) errs.push(`flags[${i}]: duplicate id ${flag.id}`);
    seen.add(flag?.id);
    if (errs.length) errors.push(...errs.map((e) => `${FLAGS_FILE} ${e}`));
    else valid.push({ authorities: [], ...flag });
  });
  return { config, flags: valid, errors };
}
