export type TokenGateRule = {
  id: string;
  enabled: boolean;
  minTokenBalance?: number;
  requiredCollection?: string;
};

export type TokenGateContext = {
  walletAddress: string;
  tokenBalance?: number;
  collectionMemberships?: string[];
};

export type TokenGateResult = {
  allowed: boolean;
  reason?: string;
};

export function evaluateTokenGate(
  rule: TokenGateRule,
  context: TokenGateContext
): TokenGateResult {
  if (!rule.enabled) {
    return { allowed: true };
  }

  if (typeof rule.minTokenBalance === "number") {
    const balance = context.tokenBalance ?? 0;
    if (balance < rule.minTokenBalance) {
      return {
        allowed: false,
        reason: "Insufficient token balance for this campaign.",
      };
    }
  }

  if (rule.requiredCollection) {
    const memberships = context.collectionMemberships ?? [];
    if (!memberships.includes(rule.requiredCollection)) {
      return {
        allowed: false,
        reason: "Wallet is missing required collection membership.",
      };
    }
  }

  return { allowed: true };
}
