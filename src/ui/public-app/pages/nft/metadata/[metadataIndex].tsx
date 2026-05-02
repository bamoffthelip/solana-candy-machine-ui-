import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

type NftMetadata = {
  name: string;
  symbol: string;
  description: string;
  image: string;
  animation_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
};

const NftMetadataViewPage: NextPage = () => {
  const router = useRouter();
  const [metadata, setMetadata] = useState<NftMetadata | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const metadataIndex = useMemo(() => {
    if (typeof router.query.metadataIndex !== "string") return null;
    const parsed = Number(router.query.metadataIndex);
    return Number.isFinite(parsed) ? Math.floor(parsed) : null;
  }, [router.query.metadataIndex]);

  const projectId = useMemo(() => {
    if (typeof router.query.projectId !== "string" || !router.query.projectId) return "unify";
    return router.query.projectId;
  }, [router.query.projectId]);

  useEffect(() => {
    if (!router.isReady || metadataIndex === null) return;

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `/api/public/nft/${metadataIndex}?projectId=${encodeURIComponent(projectId)}`
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Unable to load metadata");
        }
        if (!cancelled) {
          setMetadata(data as NftMetadata);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Unable to load metadata");
          setMetadata(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, metadataIndex, projectId]);

  const pageTitle = metadata ? `${metadata.name} | NFT Metadata` : "NFT Metadata";
  const pageDescription = metadata?.description || "View NFT metadata and media.";
  const mediaUrl = metadata?.animation_url || metadata?.image || "";
  const isVideo = Boolean(metadata?.animation_url);

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        {mediaUrl ? <meta property="og:image" content={mediaUrl} /> : null}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        {mediaUrl ? <meta name="twitter:image" content={mediaUrl} /> : null}
      </Head>

      <main className="mx-auto w-full max-w-5xl p-4">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-fuchsia-500">
          NFT Metadata View
        </h1>

        {loading ? <p className="mt-4 text-sm opacity-80">Loading metadata...</p> : null}
        {error ? (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {metadata ? (
          <section className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
              {isVideo ? (
                <video src={mediaUrl} controls className="h-full w-full object-cover" />
              ) : (
                <img src={mediaUrl} alt={metadata.name} className="h-full w-full object-cover" />
              )}
            </div>

            <div className="space-y-4 rounded-xl border border-white/10 bg-black/20 p-4">
              <div>
                <h2 className="text-xl font-semibold">{metadata.name}</h2>
                <p className="mt-1 text-sm opacity-80">{metadata.description}</p>
              </div>

              <div>
                <p className="text-sm font-semibold">Attributes</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {metadata.attributes?.map((attribute) => (
                    <div
                      key={`${attribute.trait_type}-${attribute.value}`}
                      className="rounded-md border border-white/10 bg-black/20 p-2"
                    >
                      <p className="text-xs opacity-60">{attribute.trait_type}</p>
                      <p className="text-sm">{attribute.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
};

export default NftMetadataViewPage;
