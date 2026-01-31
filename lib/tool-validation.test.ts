import { describe, it, expect } from "vitest";
import {
  validateToolArgs,
  proposeEventSchema,
} from "./tool-validation";

const tz = "America/New_York";

describe("validateToolArgs", () => {
  it("allows list_events with date-only range", () => {
    const args = validateToolArgs("list_events", {
      timeMin: "2024-01-01",
      timeMax: "2024-01-02",
    });
    expect(args.timeMin).toBe("2024-01-01");
  });

  it("rejects propose_event missing timezone", () => {
    expect(() =>
      validateToolArgs("propose_event", {
        summary: "Test",
        startDateTime: "2024-01-01T10:00:00-05:00",
        endDateTime: "2024-01-01T11:00:00-05:00",
      })
    ).toThrow();
  });

  it("rejects invalid ISO", () => {
    expect(() =>
      validateToolArgs("propose_event", {
        summary: "Test",
        startDateTime: "bad-date",
        endDateTime: "2024-01-01T11:00:00-05:00",
        timeZone: tz,
      })
    ).toThrow();
  });

  it("accepts a full valid propose_event", () => {
    const args = validateToolArgs("propose_event", {
      summary: "Team sync",
      startDateTime: "2024-01-01T10:00:00-05:00",
      endDateTime: "2024-01-01T11:00:00-05:00",
      timeZone: tz,
      attendees: [{ email: "a@example.com" }],
    });
    expect(args.summary).toBe("Team sync");
    expect(args.attendees?.[0]?.email).toBe("a@example.com");
  });
});

describe("proposeEventSchema", () => {
  it("fails if transparency value invalid", () => {
    expect(() =>
      proposeEventSchema.parse({
        summary: "Test",
        startDateTime: "2024-01-01T10:00:00-05:00",
        endDateTime: "2024-01-01T11:00:00-05:00",
        timeZone: tz,
        transparency: "busy",
      })
    ).toThrow();
  });
});
