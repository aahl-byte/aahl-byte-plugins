import { z } from "zod";
import { defineTool, text } from "../../lib/tool.mjs";

export const meta = {
  why: "Starts an expert session in another repo and sends it a question; the text goes on stdin so it can never be read as a flag.",
  layer: "type",
  takes: ["message-sessions"],
};

export default defineTool({
  name: "Session_Ask",
  description:
    "Start an expert Claude session in another repo and ask it a question. Inside a Watchtower session the reply arrives later as a message; " +
    "otherwise this waits for the reply (up to timeout seconds) and returns it.",
  input: {
    dir: z.string().regex(/^\/[^\0]*$/, "an absolute path").describe("the repo to start the expert in"),
    text: text("the question"),
    model: z.enum(["haiku", "sonnet", "opus"]).describe("the expert's model"),
    effort: z.enum(["low", "medium", "high", "xhigh"]).describe("the expert's effort"),
    timeout: z.number().int().min(30).max(3600).optional().describe("seconds to wait for the reply (default 900)"),
  },
  meta,
  outward: true,
  command({ dir, text, model, effort, timeout = 900 }) {
    return {
      program: "wt-session",
      args: ["ask", dir, "-", "--model", model, "--effort", effort, "--timeout", String(timeout)],
      stdin: text,
      timeoutMs: (timeout + 60) * 1000,
    };
  },
});
