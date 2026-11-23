export function parseInspectionId(raw: string): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw Object.assign(new Error("Invalid id."), { status: 400 });
  }
  return value;
}

export async function GET(req: Request, args: { id: string }) {
  const inspection = parseInspectionId(args.id);
  return Response.json({ inspection, url: req.url });
}
