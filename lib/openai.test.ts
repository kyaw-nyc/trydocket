import { describe, it, expect } from "vitest";
import {
  roundToNearest5Minutes,
  roundUpToNext5Minutes,
  isValidIsoString,
  getSystemPrompt,
} from "./openai";

const TZ = "America/New_York";

describe("roundToNearest5Minutes", () => {
  it("rounds down near midnight", () => {
    const result = roundToNearest5Minutes("2024-01-01T00:02:00", TZ);
    expect(result).toBe("2024-01-01T00:00:00-05:00");
  });

  it("rounds up near midnight", () => {
    const result = roundToNearest5Minutes("2024-01-01T00:03:00", TZ);
    expect(result).toBe("2024-01-01T00:05:00-05:00");
  });

  it("rounds up across the hour", () => {
    const result = roundToNearest5Minutes("2024-01-01T10:58:00", TZ);
    expect(result).toBe("2024-01-01T11:00:00-05:00");
  });

  it("rolls over to next day at 23:59", () => {
    const result = roundToNearest5Minutes("2024-01-01T23:59:00", TZ);
    expect(result).toBe("2024-01-02T00:00:00-05:00");
  });
});

describe("roundUpToNext5Minutes (ceil)", () => {
  it("ceil handles 00:02 -> 00:05", () => {
    const result = roundUpToNext5Minutes("2024-01-01T00:02:00", TZ);
    expect(result).toBe("2024-01-01T00:05:00-05:00");
  });

  it("ceil handles 00:03 -> 00:05", () => {
    const result = roundUpToNext5Minutes("2024-01-01T00:03:00", TZ);
    expect(result).toBe("2024-01-01T00:05:00-05:00");
  });

  it("ceil handles 10:58 -> 11:00", () => {
    const result = roundUpToNext5Minutes("2024-01-01T10:58:00", TZ);
    expect(result).toBe("2024-01-01T11:00:00-05:00");
  });

  it("ceil handles 23:59 -> next day 00:00", () => {
    const result = roundUpToNext5Minutes("2024-01-01T23:59:00", TZ);
    expect(result).toBe("2024-01-02T00:00:00-05:00");
  });
});

describe("DST boundaries in America/New_York", () => {
  it("spring forward skips to 03:00", () => {
    const result = roundUpToNext5Minutes("2024-03-10T01:59:00", TZ);
    expect(result).toBe("2024-03-10T03:00:00-04:00");
  });

  it("fall back folds to 01:00 with new offset", () => {
    const result = roundUpToNext5Minutes("2024-11-03T01:58:00", TZ);
    expect(result).toBe("2024-11-03T02:00:00-05:00");
  });
});

describe("ISO validation", () => {
  it("accepts valid ISO strings", () => {
    expect(isValidIsoString("2024-01-01T12:30:00-05:00")).toBe(true);
  });

  it("rejects invalid month", () => {
    expect(isValidIsoString("2024-13-01T00:00:00Z")).toBe(false);
  });
});

describe("getSystemPrompt", () => {
  const prompt = getSystemPrompt("Saturday, January 31, 2026 10:00 AM", TZ);

  it("includes current time and timezone", () => {
    expect(prompt).toContain("Current date/time: Saturday, January 31, 2026 10:00 AM");
    expect(prompt).toContain(`User's timezone: ${TZ}`);
  });

  it("includes key safety rules", () => {
    expect(prompt).toContain("Decision Policy");
    expect(prompt).toContain("Never fabricate or guess event IDs");
    expect(prompt).toContain("Default duration when missing: 30 minutes");
  });
});
