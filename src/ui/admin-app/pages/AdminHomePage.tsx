import type { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";

const AdminHomePage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Unify Admin</title>
        <meta
          name="description"
          content="Admin console scaffold for Unify campaign and mint operations."
        />
      </Head>

      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-3xl font-bold">Unify Admin</h1>
        <p className="mt-2 text-sm opacity-80">
          Architecture-aligned scaffold for campaign setup, metadata workflows, and mint controls.
        </p>

        <section className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
          <h2 className="text-lg font-semibold">Tools</h2>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              <Link
                href="/admin/claim-store"
                className="link link-hover text-indigo-300"
              >
                Claim Store · inspect / reset campaign counters
              </Link>
            </li>
          </ul>
        </section>

        <section className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
          <h2 className="text-lg font-semibold">Next Steps</h2>
          <ul className="mt-2 list-disc pl-5 text-sm opacity-80">
            <li>Campaign creation and management flows</li>
            <li>Asset upload and metadata builder integration</li>
            <li>Airdrop and mint monitoring dashboard</li>
          </ul>
        </section>
      </main>
    </>
  );
};

export default AdminHomePage;
