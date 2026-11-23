import { signOutput } from "@/lib/doors";

export const meta = { why: "standalone text, e.g. search boxes and toolbars" };

export function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input {...signOutput("TextInput")} value={value} onChange={(e) => onChange(e.target.value)} />;
}
