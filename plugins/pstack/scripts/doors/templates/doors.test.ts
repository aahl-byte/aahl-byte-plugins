import { describe, expect, it } from "vitest";
import { signAction, signOutput, signRequest, type DoorStamp } from "./doors";

describe("door signatures", () => {
  it("marks rendered output with data-door", () => {
    expect(signOutput("NoteComposer")).toEqual({ "data-door": "NoteComposer" });
  });

  it("adds X-Door to a request and keeps its other headers and options", () => {
    const init = signRequest("NewFindingForm", { method: "POST", headers: { "Content-Type": "application/json" } });
    const headers = new Headers(init.headers);
    expect(init.method).toBe("POST");
    expect(headers.get("X-Door")).toBe("NewFindingForm");
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("binds the door's stamp as a server action's first argument", async () => {
    const action = async (stamp: DoorStamp, title: string) => `${stamp.door}:${title}`;
    await expect(signAction("NewFindingForm", action)("x")).resolves.toBe("NewFindingForm:x");
  });
});
