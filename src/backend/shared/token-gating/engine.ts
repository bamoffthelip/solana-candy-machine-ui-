import { TokenGateContext, TokenGatePolicy } from "../types/phase3";

export type TokenGateDecision = {
  allowed: boolean;
  reason?: string;
};

export function evaluateTokenGatePolicy(
  policy: TokenGatePolicy,
  context: TokenGateContext
): TokenGateDecision {
  if (!policy.enabled) {
    return { allowed: true };
  }

  if (policy.allowlist?.length) {
    const isAllowed = policy.allowlist.includes(context.walletAddress);
    if (!isAllowed) {
      return { allowed: false, reason: "Wallet is not allowlisted for this campaign." };
    }
  }

  if (typeof policy.minTokenBalance === "number") {
    const balance = context.tokenBalance ?? 0;
    if (balance < policy.minTokenBalance) {
      return { allowed: false, reason: "Wallet does not meet minimum token balance." };
    }
  }

  if (policy.requiredCollection) {
    const memberships = context.collectionMemberships ?? [];
    if (!memberships.includes(policy.requiredCollection)) {
      return { allowed: false, reason: "Wallet is not in the required collection." };
    }
  }

  return { allowed: true };
}
