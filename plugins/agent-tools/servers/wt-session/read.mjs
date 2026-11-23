import { z } from "zod";
import { defineTool } from "../../lib/tool.mjs";

export const meta = {
  why: "Reads the last message of a Watchtower session, read-only.",
  layer: "type",
  takes: ["read-sessions"],
};

export const sessionId = z
  .string()
  .regex(/^@?[A-Za-z0-9][A-Za-z0-9._-]*$/, "a session id prefix or @name from Session_List")
  .describe("a session id prefix or @name from Session_List");

export default defineTool({
  name: "Session_Read",
  description: "Print the last message in a Watchtower session's transcript.",
  input: { id: sessionId },
  meta,
  readOnly: true,
  command({ id }) {
    return { program: "wt-session", args: ["read", id] };
  },
});
