import type { NextApiRequest, NextApiResponse } from "next";
import { processMintJob } from "../../../shared/workers/mint-worker";
import { getMintJob } from "../../../shared/db/repositories";

type ResponseData = {
  ok: boolean;
  jobId?: string;
  stages?: string[];
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const { jobId } = req.body || {};
  if (!jobId || typeof jobId !== "string") {
    return res.status(400).json({ ok: false, error: "Missing jobId" });
  }

  const job = await getMintJob(jobId);
  if (!job) {
    return res.status(404).json({ ok: false, error: "Mint job not found" });
  }

  const result = await processMintJob(job);
  return res.status(200).json({
    ok: true,
    jobId: result.jobId,
    stages: result.planStages,
  });
}
