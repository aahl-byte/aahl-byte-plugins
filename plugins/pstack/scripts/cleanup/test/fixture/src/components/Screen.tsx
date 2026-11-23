export function Screen({ onSave }: { onSave: () => void }) {
  return (
    <div onClick={onSave}>
      <button type="button" onClick={onSave}>
        Save
      </button>
      <input name="note" />
      <select name="kind" />
      <a href="https://example.com">Help</a>
    </div>
  );
}
