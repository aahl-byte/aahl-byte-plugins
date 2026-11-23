export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <header className="card-header">
        <h2 className="card-title">{title}</h2>
      </header>
      <div className="card-body">{children}</div>
      <button type="button" onClick={() => undefined}>Close</button>
    </section>
  );
}
