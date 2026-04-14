import { FC } from "react";
import { MintStage } from "./MintProgress";

type MintButtonProps = {
  stage: MintStage;
  disabled?: boolean;
  onMint: () => void;
};

export const MintButton: FC<MintButtonProps> = ({ stage, disabled, onMint }) => {
  const isLoading =
    stage === "preparing" ||
    stage === "uploading" ||
    stage === "minting" ||
    stage === "finalizing";

  const label = isLoading ? "Minting..." : "Mint cNFT";

  return (
    <button
      className="btn w-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-black hover:from-white hover:to-purple-300"
      disabled={disabled || isLoading}
      onClick={onMint}
    >
      {label}
    </button>
  );
};

