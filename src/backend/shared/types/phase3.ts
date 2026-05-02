export type MintJobStatus =
  | "queued"
  | "preparing"
  | "gated"
  | "signing"
  | "broadcasting"
  | "confirmed"
  | "failed";

export type MintJob = {
  id: string;
  projectId: string;
  campaignId?: string;
  recipient: string;
  metadataIndex?: number;
  status: MintJobStatus;
  idempotencyKey: string;
  createdAt: string;
};

export type TokenGatePolicy = {
  id: string;
  campaignId: string;
  enabled: boolean;
  minTokenBalance?: number;
  requiredCollection?: string;
  allowlist?: string[];
};

export type TokenGateContext = {
  walletAddress: string;
  tokenBalance?: number;
  collectionMemberships?: string[];
};

export type MpcSession = {
  id: string;
  walletAddress: string;
  state: "created" | "device-bound" | "challenge-issued" | "verified" | "revoked";
  challengeNonce?: string;
  deviceId?: string;
  createdAt: string;
};

export type WebhookEvent = {
  id: string;
  source: "crossmint" | "helius" | "custom";
  eventType: string;
  payload: unknown;
  receivedAt: string;
};
