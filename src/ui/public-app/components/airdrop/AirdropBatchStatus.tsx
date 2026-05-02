import { FC } from "react";

export type RowStatus = "pending" | "running" | "ok" | "err";

export type AirdropRow = {
  address: string;
  status: RowStatus;
  signature?: string;
  metadataIndex?: number;
  error?: string;
};

type AirdropBatchStatusProps = {
  rows: AirdropRow[];
  progressLabel: string;
};

export const AirdropBatchStatus: FC<AirdropBatchStatusProps> = ({ rows, progressLabel }) => {
  const done = rows.filter((r) => r.status === "ok" || r.status === "err").length;

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Progress</p>
        <p className="text-xs opacity-80">
          {done} / {rows.length} · {progressLabel}
        </p>
      </div>
      <div className="max-h-72 overflow-auto rounded-lg border border-white/10">
        <table className="table w-full table-fixed text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-black/40">
              <th className="w-1/3">Address</th>
              <th className="w-24">Status</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.address} className="border-b border-white/5">
                <td className="break-all font-mono opacity-90">{r.address}</td>
                <td>
                  <span
                    className={
                      r.status === "ok"
                        ? "text-emerald-400"
                        : r.status === "err"
                          ? "text-red-300"
                          : r.status === "running"
                            ? "text-indigo-300"
                            : "opacity-50"
                    }
                  >
                    {r.status}
                  </span>
                </td>
                <td className="break-all">
                  {r.signature ? (
                    <a
                      href={`https://solscan.io/tx/${r.signature}`}
                      target="_blank"
                      rel="noreferrer"
                      className="link link-hover text-indigo-300"
                    >
                      {r.signature.slice(0, 12)}…
                    </a>
                  ) : r.error ? (
                    <span className="text-red-300">{r.error}</span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
