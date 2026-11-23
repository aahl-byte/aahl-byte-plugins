import { defineTool, text } from "../../lib/tool.mjs";

export const meta = {
  why: "Sends the dk-batch completion push notification; outward-facing, so it is a tool of its own.",
  layer: "type",
  takes: ["run-plugin-script"],
};

export default defineTool({
  name: "DevKernel_Notify",
  description: "Send a push notification through ntfy.sh to the topic in $NTFY_TOPIC, e.g. when an initiative completes.",
  input: { message: text("the notification text") },
  meta,
  outward: true,
  command({ message }, ctx) {
    return { program: "node", args: [`${ctx.pluginDir("dev-kernel")}/scripts/comms/ntfy.js`, message] };
  },
});
