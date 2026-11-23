// Loads config.json, the one place thresholds, layers and event order live.
import fs from "node:fs";

export const CONFIG_PATH = new URL("../config.json", import.meta.url);

export function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}
