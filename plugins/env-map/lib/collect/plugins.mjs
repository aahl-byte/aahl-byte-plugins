// Parses installed_plugins.json: the plugins that apply to this project, enabled or not, ours or external.
export function parseInstalledPlugins({ text, projectRoot, enabled, ourMarketplaces }) {
  const json = JSON.parse(text);
  const out = [];
  for (const [key, entries] of Object.entries(json.plugins ?? {})) {
    const [name, marketplace = ""] = key.split("@");
    const entry = (entries ?? []).find((e) => e.scope === "user" || ((e.scope === "local" || e.scope === "project") && e.projectPath === projectRoot));
    if (!entry) continue;
    out.push({
      key,
      name,
      marketplace,
      version: String(entry.version ?? "unknown"),
      installPath: entry.installPath,
      scope: entry.scope,
      enabled: enabled[key] === true,
      owner: ourMarketplaces.includes(marketplace) ? "ours" : "external",
    });
  }
  return out.sort((a, b) => (a.key < b.key ? -1 : 1));
}
