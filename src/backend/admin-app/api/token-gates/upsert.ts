import type { NextApiRequest, NextApiResponse } from "next";
import { saveTokenGatePolicy } from "../../../shared/db/repositories";
import { TokenGatePolicy } from "../../../shared/types/phase3";

type ResponseData = {
  ok: boolean;
  policy?: TokenGatePolicy;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const policy = req.body as TokenGatePolicy;
  if (!policy?.id || !policy?.campaignId) {
    return res.status(400).json({ ok: false, error: "Invalid token gate policy payload" });
  }

  const savedPolicy = await saveTokenGatePolicy(policy);
  return res.status(200).json({ ok: true, policy: savedPolicy });
}
