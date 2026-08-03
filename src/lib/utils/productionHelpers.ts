export type ProductionProjection = {
  month?: string;
  production?: number;
};

/**
 * Current month as `YYYY-MM`.
 */
export function currentYearMonth(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Sum only the production still ahead of us.
 *
 * `plannedProduction.projections` covers the asset's whole life, starting well
 * before today — for Wressle-1 it runs 2025-05 → 2027-12, of which roughly half
 * has already been produced and distributed. Summing the lot and labelling it
 * "Exp. Remaining" overstates what a buyer is actually buying into by ~2x.
 *
 * @param projections Whole-life monthly projections.
 * @param fromMonth   Inclusive `YYYY-MM` lower bound; defaults to this month.
 */
export function sumRemainingProduction(
  projections: ProductionProjection[] | undefined,
  fromMonth: string = currentYearMonth(),
): number {
  if (!Array.isArray(projections)) {
    return 0;
  }

  return projections.reduce((total, projection) => {
    const month = projection?.month;
    if (typeof month !== "string" || month < fromMonth) {
      return total;
    }
    const production = Number(projection?.production);
    return Number.isFinite(production) ? total + production : total;
  }, 0);
}
