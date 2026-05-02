import { buildMintPipelinePlan } from "../minting/pipeline";
import { MintJob } from "../types/phase3";

export type MintWorkerResult = {
  jobId: string;
  accepted: boolean;
  planStages: string[];
};

export async function processMintJob(job: MintJob): Promise<MintWorkerResult> {
  const plan = buildMintPipelinePlan(job);
  return {
    jobId: job.id,
    accepted: true,
    planStages: plan.steps.map((step) => step.stage),
  };
}
