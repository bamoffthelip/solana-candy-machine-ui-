import { PrismaClient } from "@prisma/client";
import { MintJob, MpcSession, TokenGatePolicy, WebhookEvent } from "../types/phase3";

const prisma = new PrismaClient();

function mapMintJob(row: {
  id: string;
  projectId: string;
  campaignId: string | null;
  recipient: string;
  metadataIndex: number | null;
  status: string;
  idempotencyKey: string;
  createdAt: Date;
}): MintJob {
  return {
    id: row.id,
    projectId: row.projectId,
    campaignId: row.campaignId ?? undefined,
    recipient: row.recipient,
    metadataIndex: row.metadataIndex ?? undefined,
    status: row.status as MintJob["status"],
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapTokenGatePolicy(row: {
  id: string;
  campaignId: string;
  enabled: boolean;
  minTokenBalance: number | null;
  requiredCollection: string | null;
  allowlistJson: unknown;
}): TokenGatePolicy {
  return {
    id: row.id,
    campaignId: row.campaignId,
    enabled: row.enabled,
    minTokenBalance: row.minTokenBalance ?? undefined,
    requiredCollection: row.requiredCollection ?? undefined,
    allowlist: Array.isArray(row.allowlistJson)
      ? row.allowlistJson.filter((v): v is string => typeof v === "string")
      : undefined,
  };
}

function mapMpcSession(row: {
  id: string;
  walletAddress: string;
  state: string;
  challengeNonce: string | null;
  deviceId: string | null;
  createdAt: Date;
}): MpcSession {
  return {
    id: row.id,
    walletAddress: row.walletAddress,
    state: row.state as MpcSession["state"],
    challengeNonce: row.challengeNonce ?? undefined,
    deviceId: row.deviceId ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapWebhookEvent(row: {
  id: string;
  source: string;
  eventType: string;
  payload: unknown;
  receivedAt: Date;
}): WebhookEvent {
  return {
    id: row.id,
    source: row.source as WebhookEvent["source"],
    eventType: row.eventType,
    payload: row.payload,
    receivedAt: row.receivedAt.toISOString(),
  };
}

export async function saveMintJob(job: MintJob): Promise<MintJob> {
  const row = await prisma.mintJob.upsert({
    where: { id: job.id },
    update: {
      projectId: job.projectId,
      campaignId: job.campaignId ?? null,
      recipient: job.recipient,
      metadataIndex: job.metadataIndex ?? null,
      status: job.status,
      idempotencyKey: job.idempotencyKey,
    },
    create: {
      id: job.id,
      projectId: job.projectId,
      campaignId: job.campaignId ?? null,
      recipient: job.recipient,
      metadataIndex: job.metadataIndex ?? null,
      status: job.status,
      idempotencyKey: job.idempotencyKey,
    },
  });

  return mapMintJob(row);
}

export async function getMintJob(jobId: string): Promise<MintJob | undefined> {
  const row = await prisma.mintJob.findUnique({
    where: { id: jobId },
  });

  return row ? mapMintJob(row) : undefined;
}

export async function saveTokenGatePolicy(
  policy: TokenGatePolicy
): Promise<TokenGatePolicy> {
  const row = await prisma.tokenGatePolicy.upsert({
    where: { id: policy.id },
    update: {
      campaignId: policy.campaignId,
      enabled: policy.enabled,
      minTokenBalance: policy.minTokenBalance ?? null,
      requiredCollection: policy.requiredCollection ?? null,
      allowlistJson: policy.allowlist ?? null,
    },
    create: {
      id: policy.id,
      campaignId: policy.campaignId,
      enabled: policy.enabled,
      minTokenBalance: policy.minTokenBalance ?? null,
      requiredCollection: policy.requiredCollection ?? null,
      allowlistJson: policy.allowlist ?? null,
    },
  });

  return mapTokenGatePolicy(row);
}

export async function getTokenGatePolicy(
  policyId: string
): Promise<TokenGatePolicy | undefined> {
  const row = await prisma.tokenGatePolicy.findUnique({
    where: { id: policyId },
  });

  return row ? mapTokenGatePolicy(row) : undefined;
}

export async function saveMpcSession(session: MpcSession): Promise<MpcSession> {
  const row = await prisma.mpcSession.upsert({
    where: { id: session.id },
    update: {
      walletAddress: session.walletAddress,
      state: session.state,
      deviceId: session.deviceId ?? null,
      challengeNonce: session.challengeNonce ?? null,
    },
    create: {
      id: session.id,
      walletAddress: session.walletAddress,
      state: session.state,
      deviceId: session.deviceId ?? null,
      challengeNonce: session.challengeNonce ?? null,
    },
  });

  return mapMpcSession(row);
}

export async function getMpcSession(
  sessionId: string
): Promise<MpcSession | undefined> {
  const row = await prisma.mpcSession.findUnique({
    where: { id: sessionId },
  });

  return row ? mapMpcSession(row) : undefined;
}

export async function saveWebhookEvent(
  event: WebhookEvent
): Promise<WebhookEvent> {
  const row = await prisma.webhookEvent.create({
    data: {
      id: event.id,
      source: event.source,
      eventType: event.eventType,
      payload: event.payload as object,
      signature: null,
      processed: false,
      processedAt: null,
      errorMessage: null,
    },
  });

  return mapWebhookEvent(row);
}
