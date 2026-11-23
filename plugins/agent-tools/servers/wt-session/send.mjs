import { defineTool, text } from "../../lib/tool.mjs";
import { sessionId } from "./read.mjs";

export const meta = {
  why: "Messages a running or stopped session as another agent (never as the user); the text goes on stdin.",
  layer: "type",
  takes: ["message-sessions"],
};

export default defineTool({
  name: "Session_Send",
  description: "Send a message to a Watchtower session's inbox, resuming it if stopped. It arrives as another agent's message, not the user's.",
  input: {
    who: sessionId,
    text: text("the message"),
  },
  meta,
  outward: true,
  command({ who, text }) {
    return { program: "wt-session", args: ["send", who, "-"], stdin: text };
  },
});
