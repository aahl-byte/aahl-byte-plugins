// Doors sign their work: rendered output carries data-door, requests carry X-Door, server actions a bound stamp.
// Calling any of these makes a file a door; the flag checker lists doors as the authorities on what they use.

export type DoorStamp = { readonly door: string };

/** Spread onto the door's root element: <div {...signOutput("NoteComposer")}>. */
export function signOutput(name: string): { "data-door": string } {
  return { "data-door": name };
}

/** A fetch init with the door's X-Door header: fetch(url, signRequest("NewFindingForm", { method: "POST" })). */
export function signRequest(name: string, init: RequestInit = {}): RequestInit {
  const headers = new Headers(init.headers);
  headers.set("X-Door", name);
  return { ...init, headers };
}

/** A server action with the door's stamp bound first; the action is declared as (stamp: DoorStamp, ...args). */
export function signAction<Args extends unknown[], Result>(
  name: string,
  action: (stamp: DoorStamp, ...args: Args) => Promise<Result>
): (...args: Args) => Promise<Result> {
  return action.bind(null, { door: name });
}
