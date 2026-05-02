import crypto from "crypto";
import { WebhookEvent } from "../types/phase3";

function nowIso(): string {
  return new Date().toISOString();
}

export function parseWebhookEvent(
  source: WebhookEvent["source"],
  eventType: string,
  payload: unknown
): WebhookEvent {
  return {
    id: crypto.randomUUID(),
    source,
    eventType,
    payload,
    receivedAt: nowIso(),
  };
}

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  const computed = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const provided = Buffer.from(signatureHeader);
  const expected = Buffer.from(computed);
  if (provided.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(provided, expected);
}
