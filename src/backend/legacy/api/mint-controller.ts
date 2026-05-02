export * from "../public-app/api/mint-controller";
import {
  buildMintPipelinePreview,
  MintPipelineInput,
  MintPipelinePreview,
} from "../services/minting-pipeline";

export type PrepareMintRequest = MintPipelineInput;

export type PrepareMintResponse = {
  ok: true;
  preview: MintPipelinePreview;
};

export function prepareMint(request: PrepareMintRequest): PrepareMintResponse {
  const preview = buildMintPipelinePreview(request);
  return {
    ok: true,
    preview,
  };
}
