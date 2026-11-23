// why: a note that sends on Enter and saves itself
import { signOutput } from "@/lib/doors";

export function NoteComposer({ onSend }: { onSend: (text: string) => void }) {
  return <textarea {...signOutput("NoteComposer")} onKeyDown={(e) => e.key === "Enter" && onSend(e.currentTarget.value)} />;
}
