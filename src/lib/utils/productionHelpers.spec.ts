import { describe, it, expect } from "vitest";
import {
  currentYearMonth,
  sumRemainingProduction,
} from "./productionHelpers";
import { isEffectivelySoldOut } from "./supplyThresholds";

// Shape of the live Wressle-1 plannedProduction.projections: whole-life,
// 2025-05 → 2027-12. Abridged, with real values at the boundaries.
const PROJECTIONS = [
  { month: "2025-05", production: 100 },
  { month: "2025-06", production: 200 },
  { month: "2026-07", production: 300 },
  { month: "2026-08", production: 400 },
  { month: "2026-09", production: 500 },
  { month: "2027-12", production: 600 },
];

describe("currentYearMonth", () => {
  it("formats as YYYY-MM", () => {
    expect(currentYearMonth(new Date("2026-08-03T12:00:00Z"))).toBe("2026-08");
  });

  it("zero-pads single-digit months", () => {
    expect(currentYearMonth(new Date("2026-01-31T23:59:59Z"))).toBe("2026-01");
  });
});

describe("sumRemainingProduction", () => {
  it("excludes months already produced", () => {
    // From 2026-08: 400 + 500 + 600. The 100/200/300 are already produced.
    expect(sumRemainingProduction(PROJECTIONS, "2026-08")).toBe(1500);
  });

  it("includes the current month", () => {
    expect(sumRemainingProduction(PROJECTIONS, "2026-07")).toBe(1800);
  });

  it("differs sharply from the whole-life total it replaces", () => {
    const wholeLife = PROJECTIONS.reduce((a, p) => a + p.production, 0);
    expect(wholeLife).toBe(2100);
    expect(sumRemainingProduction(PROJECTIONS, "2026-08")).toBeLessThan(
      wholeLife,
    );
  });

  it("returns 0 once the asset is past its final projection", () => {
    expect(sumRemainingProduction(PROJECTIONS, "2028-01")).toBe(0);
  });

  it("returns 0 for missing or malformed input", () => {
    expect(sumRemainingProduction(undefined, "2026-08")).toBe(0);
    expect(sumRemainingProduction([], "2026-08")).toBe(0);
    expect(
      sumRemainingProduction(
        [{ month: undefined, production: 999 }],
        "2026-08",
      ),
    ).toBe(0);
  });

  it("skips entries with non-numeric production", () => {
    expect(
      sumRemainingProduction(
        [
          { month: "2026-09", production: Number.NaN },
          { month: "2026-10", production: 50 },
        ],
        "2026-08",
      ),
    ).toBe(50);
  });
});

// isEffectivelySoldOut is validated here against the real on-chain numbers,
// since it is the other half of the "dust" fix.
describe("isEffectivelySoldOut (real on-chain supply)", () => {
  it("treats ALB-WR1-R2's 2,000 wei of leftover supply as sold out", () => {
    // maxSupply 36,000 - minted 35,999.999999999999998
    expect(isEffectivelySoldOut(36000 - 35999.999999999999998)).toBe(true);
  });

  it("treats a fully minted token as sold out", () => {
    expect(isEffectivelySoldOut(0)).toBe(true);
  });

  it("treats a genuinely available token as not sold out", () => {
    expect(isEffectivelySoldOut(5000)).toBe(false);
    expect(isEffectivelySoldOut(1)).toBe(false);
  });

  it("treats sub-token remainders as sold out", () => {
    expect(isEffectivelySoldOut(0.5)).toBe(true);
  });

  it("does not claim sold out when availability is unknown", () => {
    expect(isEffectivelySoldOut(undefined)).toBe(false);
    expect(isEffectivelySoldOut(null)).toBe(false);
  });
});
