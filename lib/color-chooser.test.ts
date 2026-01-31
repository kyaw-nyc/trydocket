import { describe, it, expect } from "vitest";
import { selectColorId } from "./color-chooser";

const e = (start: string, end: string, colorId?: string) => ({ startDateTime: start, endDateTime: end, colorId });

describe("selectColorId", () => {
  it("defaults to first color when no existing events", () => {
    expect(selectColorId([], "2024-01-01T10:00:00Z", "2024-01-01T11:00:00Z")).toBe("9");
  });

  it("alternates when immediately adjacent", () => {
    const existing = [e("2024-01-01T09:00:00Z", "2024-01-01T10:00:00Z", "9")];
    expect(selectColorId(existing, "2024-01-01T10:05:00Z", "2024-01-01T11:00:00Z")).toBe("5");
  });

  it("resets to first color when gap is large", () => {
    const existing = [e("2024-01-01T08:00:00Z", "2024-01-01T09:00:00Z", "5")];
    expect(selectColorId(existing, "2024-01-01T12:00:00Z", "2024-01-01T13:00:00Z")).toBe("9");
  });

  it("handles unknown previous colorId gracefully", () => {
    const existing = [e("2024-01-01T09:00:00Z", "2024-01-01T10:00:00Z")];
    expect(selectColorId(existing, "2024-01-01T10:10:00Z", "2024-01-01T11:00:00Z")).toBe("9");
  });
});
