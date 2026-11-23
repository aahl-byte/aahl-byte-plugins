export function parseTestId(idParam: string): number {
  const id = Number(idParam);
  if (!Number.isFinite(id) || id <= 0) {
    throw Object.assign(new Error("Invalid finding id."), { status: 400 });
  }
  return id;
}

export async function GET(request: Request, params: { id: string }) {
  const id = parseTestId(params.id);
  return Response.json({ id, url: request.url });
}
