import type { NextApiRequest, NextApiResponse } from "next";
import { parseWebhookEvent } from "../../../shared/webhooks/event-ingestor";
import { saveWebhookEvent } from "../../../shared/db/repositories";

type ResponseData = {
  ok: boolean;
  eventId?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { eventType = "mpc.unknown", payload = req.body } = req.body || {};
  const event = parseWebhookEvent("crossmint", String(eventType), payload);
  await saveWebhookEvent(event);

  return res.status(200).json({ ok: true, eventId: event.id });
}
