import { z } from "zod";
import { defineTool } from "../../lib/tool.mjs";

export const meta = {
  why: "Lists Watchtower sessions and the repos an expert can be started in, read-only.",
  layer: "type",
  takes: ["read-sessions"],
};

export default defineTool({
  name: "Session_List",
  description: "List Watchtower sessions active in the last 24h (or since), then the repos with Claude history where Session_Ask can start an expert.",
  input: {
    since: z.string().regex(/^\d+[smhd]$/, "a duration such as 7d, 12h or 30m").optional(),
    dir: z.string().regex(/^\/[^\0]*$/, "an absolute path").optional().describe("only sessions and repos at or under this path"),
    repos: z.boolean().optional().describe("only the repos"),
  },
  meta,
  readOnly: true,
  command({ since, dir, repos }) {
    return {
      program: "wt-session",
      args: ["list", ...(since ? ["--since", since] : []), ...(dir ? ["--dir", dir] : []), ...(repos ? ["--repos"] : [])],
    };
  },
});
