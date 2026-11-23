import * as Dialog from "@radix-ui/react-dialog";

export function ReviewScreen() {
  return (
    <div onClick={() => undefined}>
      <input name="note" />
      <Dialog.Root />
    </div>
  );
}
