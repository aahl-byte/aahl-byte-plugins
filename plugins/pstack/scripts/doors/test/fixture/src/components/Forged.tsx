import { signOutput } from "@/lib/doors";

export function Forged() {
  return (
    <section {...signOutput("TextInput")}>
      <div data-door="NoteComposer" />
    </section>
  );
}
