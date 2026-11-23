import { signRequest } from "@/lib/doors";
import { createFinding } from "@/server/findings";

export function NewFindingForm() {
  const save = async () => {
    await fetch("/api/findings", signRequest("NewFindingForm", { method: "POST" }));
    await createFinding({ title: "x" });
  };
  return <form onSubmit={save} />;
}
