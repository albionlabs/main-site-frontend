import { describe, it, expect } from "vitest";
import {
  derivePayoutPerToken,
  resolvePayoutPerToken,
  toTokenCount,
} from "./payoutHelpers";

// ALB-WR1-R1 is fully minted at exactly 12,000 tokens, so the historical
// `payoutPerToken` values that used to be pinned in the metadata are an exact
// oracle for the derivation. Figures below are real production data.
const R1_SUPPLY_WEI = "12000000000000000000000"; // 12,000 * 1e18

describe("toTokenCount", () => {
  it("converts an 18-decimal wei string to a token count", () => {
    expect(toTokenCount(R1_SUPPLY_WEI)).toBe(12000);
  });

  it("converts a bigint", () => {
    expect(toTokenCount(12000n * 10n ** 18n)).toBe(12000);
  });

  it("passes a plain token count through", () => {
    expect(toTokenCount(12000)).toBe(12000);
  });

  it("returns 0 for missing or unparseable supply", () => {
    expect(toTokenCount(undefined)).toBe(0);
    expect(toTokenCount(null)).toBe(0);
    expect(toTokenCount("not-a-number")).toBe(0);
  });
});

describe("derivePayoutPerToken", () => {
  it.each([
    ["2025-09", 590.39, 0.0492],
    ["2025-10", 828.625, 0.06905],
    ["2025-11", 648.65, 0.054054],
    ["2025-12", 668.025, 0.055669],
    ["2026-01", 737.625, 0.061469],
  ])(
    "reproduces the pinned ALB-WR1-R1 payoutPerToken for %s",
    (_month, totalPayout, expected) => {
      // The pinned values were themselves rounded to ~5 decimal places, so
      // match to that precision rather than to the full quotient.
      expect(derivePayoutPerToken(totalPayout, R1_SUPPLY_WEI)).toBeCloseTo(
        expected as number,
        5,
      );
    },
  );

  it("derives a value for months where payoutPerToken was dropped from the schema", () => {
    // 2026-06, the month added by PR #180. Metadata carries payoutPerToken: 0.
    expect(derivePayoutPerToken(857.925, R1_SUPPLY_WEI)).toBeCloseTo(
      0.07149375,
      8,
    );
  });

  it("returns 0 when supply is unknown rather than dividing by zero", () => {
    expect(derivePayoutPerToken(857.925, undefined)).toBe(0);
    expect(derivePayoutPerToken(857.925, "0")).toBe(0);
    expect(Number.isFinite(derivePayoutPerToken(857.925, "0"))).toBe(true);
  });

  it("returns 0 for a zero or non-finite payout", () => {
    expect(derivePayoutPerToken(0, R1_SUPPLY_WEI)).toBe(0);
    expect(derivePayoutPerToken(Number.NaN, R1_SUPPLY_WEI)).toBe(0);
  });
});

describe("resolvePayoutPerToken", () => {
  // ALB-WR1-R2 is still selling: cap 36,000, ~21,617 minted when 2025-11 was
  // pinned. Deriving from today's supply would report $0.0664 for a month that
  // actually paid $0.1106 — so a legacy pinned value must win.
  const R2_SUPPLY_NOW_WEI = "36000000000000000000000";

  it("keeps a legacy pinned value rather than rewriting it with today's supply", () => {
    expect(resolvePayoutPerToken(0.1106, 2390.854, R2_SUPPLY_NOW_WEI)).toBe(
      0.1106,
    );
  });

  it("derives when the pinned field is 0 (schema-removed months)", () => {
    // ALB-WR1-R2 2026-06, pinned as payoutPerToken: 0.
    expect(
      resolvePayoutPerToken(0, 3018.679, R2_SUPPLY_NOW_WEI),
    ).toBeCloseTo(0.08385219, 8);
  });

  it("derives when the pinned field is missing entirely", () => {
    expect(
      resolvePayoutPerToken(undefined, 3018.679, R2_SUPPLY_NOW_WEI),
    ).toBeCloseTo(0.08385219, 8);
  });

  it("ignores a negative or non-finite pinned value", () => {
    expect(resolvePayoutPerToken(-1, 3018.679, R2_SUPPLY_NOW_WEI)).toBeCloseTo(
      0.08385219,
      8,
    );
    expect(
      resolvePayoutPerToken(Number.NaN, 3018.679, R2_SUPPLY_NOW_WEI),
    ).toBeCloseTo(0.08385219, 8);
  });
});
