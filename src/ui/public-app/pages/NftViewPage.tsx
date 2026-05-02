import type { NextPage } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useMemo } from "react";
import { getProjectConfigOrFallback } from "../../../lib/project-config";
import { MintPreview } from "../components/mint/MintPreview";
import { ClaimFlow } from "../components/claim/ClaimFlow";

const NftViewPage: NextPage = () => {
  const router = useRouter();
  if (!router.isReady) return null;
  const projectId =
    typeof router.query.projectId === "string" ? router.query.projectId : "unify";
  const project = useMemo(() => getProjectConfigOrFallback(projectId), [projectId]);

  return (
    <>
      <Head>
        <title>{project.title} | View & Claim NFT</title>
        <meta name="description" content={project.description} />
      </Head>

      <main className="mx-auto w-full max-w-6xl p-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-fuchsia-500">
            Claim NFT
          </h1>
          <p className="mt-2 text-sm opacity-75">
            View campaign NFT details and claim with connected wallet or Crossmint MPC fallback.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <MintPreview
            title={project.title}
            description={project.description}
            mediaUrl={project.mediaUrl}
            mediaType={project.mediaType}
            attributes={project.attributes}
          />
          <ClaimFlow projectId={projectId} />
        </div>
      </main>
    </>
  );
};

export default NftViewPage;
