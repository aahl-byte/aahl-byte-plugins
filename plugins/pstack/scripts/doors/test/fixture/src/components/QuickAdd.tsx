import { createFinding } from "@/server/findings";

export function QuickAdd() {
  return <button onClick={() => createFinding({ title: "quick" })}>Add</button>;
}
