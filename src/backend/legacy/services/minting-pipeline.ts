export * from "../shared-services/minting-pipeline";
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

export function buildMintPipelinePreview(input: MintPipelineInput): MintPipelinePreview {
  const normalizedBaseUri = input.metadataBaseUri.replace(/\/$/, "");
  return {
    projectId: input.projectId,
    recipient: input.recipient,
    metadataUri: `${normalizedBaseUri}/${input.metadataIndex}.json`,
    metadataIndex: input.metadataIndex,
  };
}
