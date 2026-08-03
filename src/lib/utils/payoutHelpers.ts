import { formatEther } from "viem";

/**
 * `payoutPerToken` was removed from the pinned-metadata schema.
 *
 * Entries pinned from 2026-02 onward carry `payoutPerToken: 0`, and the values
 * it held for partially-sold tokens were computed against whatever supply
 * existed at pin time — so they were never comparable across months. Token
 * supply is fixed, so the per-token figure is derived from `totalPayout`
 * instead of being read off the metadata.
 *
 * @param totalPayout   Total USD distributed for the month.
 * @param mintedSupply  Token supply as an 18-decimal wei value (the SFT's
 *                      `totalShares`), or a plain token count.
 * @returns USD per token, or 0 when the supply is unknown/zero.
 */
export function derivePayoutPerToken(
  totalPayout: number,
  mintedSupply: bigint | string | number | undefined | null,
): number {
  if (!Number.isFinite(totalPayout) || totalPayout === 0) {
    return 0;
  }

  const supply = toTokenCount(mintedSupply);
  if (!Number.isFinite(supply) || supply <= 0) {
    return 0;
  }

  return totalPayout / supply;
}

/**
 * Resolve the per-token payout for a month, preferring a pinned value.
 *
 * Entries pinned before the schema change still carry a `payoutPerToken` that
 * was computed against the supply in force at pin time. For a token that is
 * still selling (e.g. ALB-WR1-R2, cap 36,000 and rising) that legacy value is
 * closer to what holders actually received than anything we can recompute
 * today, because deriving from the *current* supply retroactively shrinks every
 * historical month and keeps drifting down as more tokens mint.
 *
 * So: trust a non-zero pinned value, and only derive when the field is absent
 * or zero — which is every month pinned from 2026-02 onward.
 *
 * KNOWN LIMITATION: derived months on a partially-sold token are still divided
 * by current supply, so they understate what early holders received. Consumers
 * that have the wallet's real claimed amount (matched by orderHash) should
 * prefer that over this estimate.
 */
export function resolvePayoutPerToken(
  pinnedPayoutPerToken: number | undefined | null,
  totalPayout: number,
  mintedSupply: bigint | string | number | undefined | null,
): number {
  if (
    typeof pinnedPayoutPerToken === "number" &&
    Number.isFinite(pinnedPayoutPerToken) &&
    pinnedPayoutPerToken > 0
  ) {
    return pinnedPayoutPerToken;
  }
  return derivePayoutPerToken(totalPayout, mintedSupply);
}

/**
 * Normalise a supply value to a whole-token count.
 *
 * Accepts the wei-denominated `totalShares` string the subgraph returns, a
 * bigint, or an already-converted token count.
 */
export function toTokenCount(
  mintedSupply: bigint | string | number | undefined | null,
): number {
  if (mintedSupply === undefined || mintedSupply === null) {
    return 0;
  }

  if (typeof mintedSupply === "number") {
    return Number.isFinite(mintedSupply) ? mintedSupply : 0;
  }

  try {
    // Strings from the subgraph are wei; anything non-integer is already a
    // token count and would throw in BigInt(), so fall through to Number().
    const asBigInt =
      typeof mintedSupply === "bigint" ? mintedSupply : BigInt(mintedSupply);
    return Number(formatEther(asBigInt));
  } catch {
    const parsed = Number(mintedSupply);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
