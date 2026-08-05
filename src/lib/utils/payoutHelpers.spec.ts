import { describe, it, expect } from "vitest";
import {
  derivePayoutPerToken,
  resolvePayoutPerToken,
  toTokenCount,
  sumPayoutRatioToDate,
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

describe("sumPayoutRatioToDate", () => {
  const month = (totalPayout: number) => ({
    month: "2025-05",
    tokenPayout: { totalPayout },
  });

  // Real production data: ALB-WR1-R1's 12 distributions, which total $9,240.62
  // against a supply fixed at 12,000 since before its first payout. Because the
  // supply never moved, this is the one case where "divide by current supply"
  // and "what an early holder actually received" cannot disagree — so it pins
  // the arithmetic without baking in the choice between them.
  const R1_DISTRIBUTIONS_TOTAL = 9240.62;

  it("divides total distributions by supply to give a multiple of the mint price", () => {
    expect(
      sumPayoutRatioToDate([month(R1_DISTRIBUTIONS_TOTAL)], R1_SUPPLY_WEI),
    ).toBeCloseTo(0.7700516, 6);
  });

  it("sums across months before dividing", () => {
    const split = [month(4000.62), month(3000), month(2240)];
    expect(sumPayoutRatioToDate(split, R1_SUPPLY_WEI)).toBeCloseTo(0.7700516, 6);
  });

  it("accepts a plain token count as readily as wei", () => {
    expect(sumPayoutRatioToDate([month(24555.02)], 36000)).toBeCloseTo(
      0.6820839,
      6,
    );
  });

  it("values every month at current supply, not supply at the time", () => {
    // ALB-WR1-R2 paid $24,555.02 over 8 months, some while only ~21,617 of its
    // 36,000 were minted. Early holders received more per token than this, and
    // that is intended: the figure answers "fully subscribed throughout".
    expect(sumPayoutRatioToDate([month(24555.02)], 36000)).toBeLessThan(
      24555.02 / 21617,
    );
  });

  it("reports 0x for a release that has not paid out yet", () => {
    expect(sumPayoutRatioToDate([], R1_SUPPLY_WEI)).toBe(0);
  });

  it("distinguishes no payouts from no payout data", () => {
    // An empty history is a real 0x; a missing history is unknown. Rendering
    // both as 0x would assert a track record the app cannot actually see.
    expect(sumPayoutRatioToDate([], R1_SUPPLY_WEI)).toBe(0);
    expect(sumPayoutRatioToDate(undefined, R1_SUPPLY_WEI)).toBeNull();
    expect(sumPayoutRatioToDate(null, R1_SUPPLY_WEI)).toBeNull();
  });

  it("returns null rather than dividing by an unknown supply", () => {
    expect(sumPayoutRatioToDate([month(9240.62)], undefined)).toBeNull();
    expect(sumPayoutRatioToDate([month(9240.62)], 0)).toBeNull();
    expect(sumPayoutRatioToDate([month(9240.62)], "not-a-number")).toBeNull();
  });

  it("skips malformed entries instead of poisoning the total with NaN", () => {
    expect(
      sumPayoutRatioToDate(
        [
          month(6000),
          { month: "2025-06", tokenPayout: { totalPayout: Number.NaN } },
          { month: "2025-07" },
          month(6000),
        ],
        12000,
      ),
    ).toBeCloseTo(1, 10);
  });
});
