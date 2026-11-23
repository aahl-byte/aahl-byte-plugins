export function signOutput(name: string) {
  return { "data-door": name };
}

export function signRequest(name: string, init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers);
  headers.set("X-Door", name);
  return { ...init, headers };
}
