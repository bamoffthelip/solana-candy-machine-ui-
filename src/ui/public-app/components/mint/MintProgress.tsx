import { FC } from "react";

export type MintStage =
  | "idle"
  | "preparing"
  | "uploading"
  | "minting"
  | "finalizing"
  | "success"
  | "error";

type MintProgressProps = {
  stage: MintStage;
};

const orderedStages: MintStage[] = [
  "preparing",
  "uploading",
  "minting",
  "finalizing",
];

const labels: Record<MintStage, string> = {
  idle: "Ready",
  preparing: "Preparing mint...",
  uploading: "Uploading assets...",
  minting: "Minting NFT...",
  finalizing: "Finalizing...",
  success: "Mint complete",
  error: "Mint failed",
};

export const MintProgress: FC<MintProgressProps> = ({ stage }) => {
  const activeIndex = orderedStages.indexOf(stage);
  const isVisible = stage !== "idle";

  if (!isVisible) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="mb-3 text-sm font-medium">{labels[stage]}</p>
      <div className="space-y-2">
        {orderedStages.map((item, idx) => {
          const done = activeIndex > idx || stage === "success";
          const active = activeIndex === idx;
          return (
            <div key={item} className="flex items-center gap-2 text-sm">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  done ? "bg-emerald-400" : active ? "bg-indigo-400" : "bg-zinc-600"
                }`}
              />
              <span className={done || active ? "opacity-100" : "opacity-60"}>
                {labels[item]}
              </span>
            </div>
          );
        })}
      </div>
      {stage === "error" ? (
        <p className="mt-3 text-xs text-red-300">Something went wrong. Please try again.</p>
      ) : null}
    </div>
  );
};

