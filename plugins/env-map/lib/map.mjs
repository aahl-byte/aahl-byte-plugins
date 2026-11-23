// One environment in, one graph out: collect every source, read git facts for repo files, build the graph.
import path from "node:path";
import { collect } from "./collect/index.mjs";
import { gitHistory } from "./collect/git-history.mjs";
import { buildGraph } from "./graph.mjs";

export function mapEnvironment({ root, home, configDirs, config, reader }) {
  const collected = collect({ root, home, configDirs, config, reader });
  const repoFiles = [
    ...new Set(collected.boxes.filter((b) => b.root === "repo" && b.file && b.kind !== "unreadable").map((b) => path.relative(root, b.file))),
  ].sort();
  const history = reader?.ref ? { asOf: null, files: {} } : gitHistory(root, repoFiles, config.flags.churn.windowDays);
  return buildGraph(collected, { config, history });
}
