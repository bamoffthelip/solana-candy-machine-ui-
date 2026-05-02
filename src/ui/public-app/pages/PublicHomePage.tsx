import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";

const PublicHomePage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Unify Public</title>
        <meta
          name="description"
          content="Public experience scaffold for Unify mint campaigns."
        />
      </Head>

      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-3xl font-bold">Unify Public Experience</h1>
        <p className="mt-2 text-sm opacity-80">
          This route group is reserved for consumer-facing campaign pages.
        </p>

        <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
          <p className="text-sm opacity-80">
            Start from an existing mint flow or campaign slug route:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link className="btn btn-sm border border-white/20 bg-black/30" href="/mint/unify">
              Open sample mint page
            </Link>
            <Link className="btn btn-sm border border-white/20 bg-black/30" href="/airdrop/unify">
              Open sample airdrop page
            </Link>
            <Link className="btn btn-sm border border-white/20 bg-black/30" href="/public/nft/unify">
              Open NFT claim page
            </Link>
          </div>
        </div>
      </main>
    </>
  );
};

export default PublicHomePage;
