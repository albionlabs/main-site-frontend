/**
 * Pure supply thresholds, deliberately free of store/service imports so that
 * callers (and tests) don't drag in the catalog service just to ask whether a
 * token is sold out.
 */

/**
 * Smallest supply worth offering, in whole tokens.
 *
 * Minting leaves rounding dust behind: ALB-WR1-R2 is capped at 36,000 and has
 * 35,999.999999999999998 minted, i.e. 2,000 wei — 0.000000000000002 tokens —
 * "available". Treating that as purchasable keeps a Buy button on a sold-out
 * token and makes every fully-diluted return calculation divide by ~zero,
 * which trips the IRR divergence guard and renders as "<0%".
 */
export const MIN_PURCHASABLE_TOKENS = 1;

export const MIN_PURCHASABLE_WEI = BigInt(MIN_PURCHASABLE_TOKENS) * 10n ** 18n;

/**
 * True when the remaining supply is dust — nothing meaningful left to buy.
 *
 * Returns false for undefined/null: unknown availability is not a claim that
 * the token is sold out.
 *
 * @param availableSupply Remaining supply as a whole-token count.
 */
export function isEffectivelySoldOut(
  availableSupply: number | undefined | null,
): boolean {
  if (availableSupply === undefined || availableSupply === null) {
    return false;
  }
  return (
    !Number.isFinite(availableSupply) ||
    availableSupply < MIN_PURCHASABLE_TOKENS
  );
}
