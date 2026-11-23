export function Panel({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <header className="card-header">
        <h2 className="card-title">{heading}</h2>
      </header>
      <div className="card-body">{children}</div>
      <button type="button" onClick={() => undefined}>Close</button>
    </section>
  );
}
