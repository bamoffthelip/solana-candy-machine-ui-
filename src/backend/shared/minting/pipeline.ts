import { MintJob } from "../types/phase3";

export type MintPipelineInput = {
  projectId: string;
  recipient: string;
  metadataBaseUri: string;
  metadataIndex: number;
};

export type MintPipelinePreview = {
  projectId: string;
  recipient: string;
  metadataUri: string;
  metadataIndex: number;
};

export type MintPipelineStage =
  | "validate-input"
  | "resolve-project"
  | "token-gate-check"
  | "generate-metadata-uri"
  | "request-mpc-signature"
  | "broadcast-transaction"
  | "confirm-transaction";

export type MintPipelineStep = {
  stage: MintPipelineStage;
  description: string;
};

export type MintPipelinePlan = {
  jobId: string;
  steps: MintPipelineStep[];
};

export function buildMintPipelinePreview(input: MintPipelineInput): MintPipelinePreview {
  const normalizedBaseUri = input.metadataBaseUri.replace(/\/$/, "");
  return {
    projectId: input.projectId,
    recipient: input.recipient,
    metadataUri: `${normalizedBaseUri}/${input.metadataIndex}.json`,
    metadataIndex: input.metadataIndex,
  };
}

export function buildMintPipelinePlan(job: MintJob): MintPipelinePlan {
  const steps: MintPipelineStep[] = [
    { stage: "validate-input", description: "Validate recipient, project, and idempotency key." },
    { stage: "resolve-project", description: "Resolve campaign and metadata settings." },
    { stage: "token-gate-check", description: "Evaluate token gating policy for recipient." },
    { stage: "generate-metadata-uri", description: "Build metadata URI for mint index." },
    { stage: "request-mpc-signature", description: "Request MPC signer authorization." },
    { stage: "broadcast-transaction", description: "Submit mint transaction to Solana RPC." },
    { stage: "confirm-transaction", description: "Confirm final signature and persist status." },
  ];

  return { jobId: job.id, steps };
}
