import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useMemo, useState } from "react";
import { AirdropRecipientInput } from "../../components/airdrop/AirdropRecipientInput";
import {
  AirdropBatchStatus,
  type AirdropRow,
} from "../../components/airdrop/AirdropBatchStatus";
import { getProjectConfigOrFallback, listProjectIds } from "../../lib/project-config";

const DEFAULT_DELAY_MS = 2000;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const AirdropProjectPage: NextPage = () => {
  const router = useRouter();
  const projectId =
    typeof router.query.projectId === "string" ? router.query.projectId : "unify";
  const project = useMemo(() => getProjectConfigOrFallback(projectId), [projectId]);

  const [rawText, setRawText] = useState("");
  const [addresses, setAddresses] = useState<string[]>([]);
  const [delayMs, setDelayMs] = useState(DEFAULT_DELAY_MS);
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<AirdropRow[]>([]);
  const [progressLabel, setProgressLabel] = useState("Idle");

  const onInputChange = useCallback((text: string, parsed: string[]) => {
    setRawText(text);
    setAddresses(parsed);
  }, []);

  const runAirdrop = async () => {
    if (addresses.length === 0) return;
    setRunning(true);
    setProgressLabel("Minting cNFTs…");

    const initial: AirdropRow[] = addresses.map((address) => ({
      address,
      status: "pending" as const,
    }));
    setRows(initial);

    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      setRows((prev) =>
        prev.map((r) =>
          r.address === address ? { ...r, status: "running" as const } : r
        )
      );
      setProgressLabel(`Minting ${i + 1} / ${addresses.length}`);

      try {
        const res = await fetch("/api/mint-cnft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipient: address, projectId }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Mint failed");
        }
        setRows((prev) =>
          prev.map((r) =>
            r.address === address
              ? {
                  ...r,
                  status: "ok" as const,
                  signature: data.signature,
                  metadataIndex: data.metadataIndex,
                }
              : r
          )
        );
      } catch (e: any) {
        setRows((prev) =>
          prev.map((r) =>
            r.address === address
              ? { ...r, status: "err" as const, error: e?.message || "Error" }
              : r
          )
        );
      }

      if (i < addresses.length - 1) {
        await wait(delayMs);
      }
    }

    setProgressLabel("Done");
    setRunning(false);
  };

  const knownIds = listProjectIds();

  return (
    <>
      <Head>
        <title>{project.title} | cNFT Airdrop</title>
        <meta name="description" content={`Bulk mint cNFTs for ${project.title}`} />
      </Head>

      <div className="mx-auto w-full max-w-5xl p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-fuchsia-500">
            cNFT Airdrop
          </h1>
          <p className="mt-2 text-sm opacity-75">
            Server-side compressed mints to a list of wallets. Same pipeline as the{" "}
            <Link href={`/mint/${projectId}`} className="link link-hover text-indigo-300">
              mint page
            </Link>
            .
          </p>
          <p className="mt-1 text-xs opacity-60">
            Projects: {knownIds.join(", ")} — add more in{" "}
            <code className="text-xs opacity-80">src/lib/project-config.ts</code>
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-white/10 bg-black/20 p-4">
          <h2 className="text-lg font-semibold">{project.title}</h2>
          <p className="mt-1 text-sm opacity-80">{project.description}</p>
          <p className="mt-2 text-xs opacity-50">projectId: {projectId}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <AirdropRecipientInput value={rawText} onChange={onInputChange} disabled={running} />
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <label className="text-sm font-semibold">Delay between mints (ms)</label>
              <input
                type="number"
                min={500}
                step={100}
                className="input input-bordered mt-2 w-full border-white/20 bg-black/40"
                value={delayMs}
                disabled={running}
                onChange={(e) => setDelayMs(Number(e.target.value) || DEFAULT_DELAY_MS)}
              />
              <p className="mt-2 text-xs opacity-60">
                Reduces RPC rate limits; increase if you see failures.
              </p>
            </div>
            <button
              type="button"
              className="btn w-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-black hover:from-white hover:to-purple-300"
              disabled={running || addresses.length === 0}
              onClick={runAirdrop}
            >
              {running ? "Airdrop running…" : `Mint ${addresses.length} cNFT(s)`}
            </button>
          </div>

          <div>
            {rows.length > 0 ? (
              <AirdropBatchStatus rows={rows} progressLabel={progressLabel} />
            ) : (
              <div className="rounded-xl border border-dashed border-white/20 bg-black/10 p-8 text-center text-sm opacity-60">
                Parse addresses on the left, then start the batch. Results appear here.
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default AirdropProjectPage;
