export function parseFindingId(idParam: string): number {
  const id = Number(idParam);
  if (!Number.isFinite(id) || id <= 0) {
    throw Object.assign(new Error("Invalid id."), { status: 400 });
  }
  return id;
}

export async function GET(request: Request, params: { id: string }) {
  const found = parseFindingId(params.id);
  return Response.json({ found, url: request.url });
}
