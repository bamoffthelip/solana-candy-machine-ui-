import type { NextPage } from "next";
import Head from "next/head";
import { useCallback, useEffect, useMemo, useState } from "react";

type ProjectStats = {
  projectId: string;
  nextIndex: number | null;
  claimsCount: number;
};

type ListResp =
  | { success: true; backend: "redis" | "file"; projects: ProjectStats[] }
  | { success: false; error: string };

type DetailResp =
  | {
      success: true;
      backend: "redis" | "file";
      projectId: string;
      stats: ProjectStats;
      wallets?: string[];
    }
  | { success: false; error: string };

type ResetResp =
  | { success: true; backend: "redis" | "file"; projectId: string; stats: ProjectStats }
  | { success: false; error: string };

const ADMIN_KEY_STORAGE = "unify_admin_key";

function authHeaders(adminKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${adminKey}`,
    "Content-Type": "application/json",
  };
}

const ClaimStorePage: NextPage = () => {
  const [adminKey, setAdminKey] = useState<string>("");
  const [keyDirty, setKeyDirty] = useState(false);
  const [backend, setBackend] = useState<"redis" | "file" | null>(null);
  const [projects, setProjects] = useState<ProjectStats[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<DetailResp | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [resetForm, setResetForm] = useState({
    projectId: "",
    nextIndex: "",
    resetCounter: true,
    resetClaims: true,
  });
  const [resetMessage, setResetMessage] = useState<string>("");

  // Load saved admin key
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.sessionStorage.getItem(ADMIN_KEY_STORAGE) || "";
    if (saved) {
      setAdminKey(saved);
    }
  }, []);

  const persistKey = useCallback((value: string) => {
    if (typeof window !== "undefined") {
      if (value) {
        window.sessionStorage.setItem(ADMIN_KEY_STORAGE, value);
      } else {
        window.sessionStorage.removeItem(ADMIN_KEY_STORAGE);
      }
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    if (!adminKey) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/admin/claim-store", {
        headers: authHeaders(adminKey),
      });
      const data = (await r.json()) as ListResp;
      if (!r.ok || !data.success) {
        throw new Error("error" in data ? data.error : "Request failed");
      }
      setBackend(data.backend);
      setProjects(data.projects);
    } catch (e: any) {
      setError(e?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [adminKey]);

  const fetchDetail = useCallback(
    async (projectId: string) => {
      if (!adminKey || !projectId) return;
      setLoading(true);
      setError("");
      try {
        const r = await fetch(
          `/api/admin/claim-store?projectId=${encodeURIComponent(projectId)}&wallets=1`,
          { headers: authHeaders(adminKey) }
        );
        const data = (await r.json()) as DetailResp;
        if (!r.ok || !data.success) {
          throw new Error("error" in data ? data.error : "Request failed");
        }
        setDetail(data);
      } catch (e: any) {
        setError(e?.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    },
    [adminKey]
  );

  // Auto-load when admin key set
  useEffect(() => {
    if (adminKey) fetchProjects();
  }, [adminKey, fetchProjects]);

  // When a project is selected, fetch detail
  useEffect(() => {
    if (selectedId) fetchDetail(selectedId);
    else setDetail(null);
  }, [selectedId, fetchDetail]);

  const submitReset = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!adminKey) {
        setError("Admin key required");
        return;
      }
      const projectId = resetForm.projectId.trim();
      if (!projectId) {
        setError("Project ID required");
        return;
      }
      const ok = window.confirm(
        `Reset project "${projectId}"?\n` +
          `- Counter: ${resetForm.resetCounter ? (resetForm.nextIndex ? `set to ${resetForm.nextIndex}` : "delete") : "untouched"}\n` +
          `- Claims:  ${resetForm.resetClaims ? "clear" : "untouched"}\n\n` +
          `Only do this BEFORE launch. Doing it mid-campaign can mint duplicate #N on chain.`
      );
      if (!ok) return;

      setLoading(true);
      setError("");
      setResetMessage("");
      try {
        const body: Record<string, unknown> = {
          projectId,
          resetCounter: resetForm.resetCounter,
          resetClaims: resetForm.resetClaims,
        };
        const parsed = Number(resetForm.nextIndex);
        if (resetForm.nextIndex.trim() !== "" && Number.isFinite(parsed)) {
          body.nextIndex = parsed;
        }
        const r = await fetch("/api/admin/claim-store", {
          method: "POST",
          headers: authHeaders(adminKey),
          body: JSON.stringify(body),
        });
        const data = (await r.json()) as ResetResp;
        if (!r.ok || !data.success) {
          throw new Error("error" in data ? data.error : "Request failed");
        }
        setResetMessage(
          `Reset OK — project "${data.projectId}" now has nextIndex=${data.stats.nextIndex ?? "—"}, claims=${data.stats.claimsCount}`
        );
        await fetchProjects();
        if (selectedId === projectId) await fetchDetail(projectId);
      } catch (e: any) {
        setError(e?.message || "Reset failed");
      } finally {
        setLoading(false);
      }
    },
    [adminKey, resetForm, fetchProjects, fetchDetail, selectedId]
  );

  const projectIdsForDatalist = useMemo(
    () => Array.from(new Set(projects.map((p) => p.projectId))),
    [projects]
  );

  return (
    <>
      <Head>
        <title>Claim Store · Unify Admin</title>
        <meta name="description" content="Inspect and reset cNFT claim counters and wallet history." />
      </Head>

      <main className="mx-auto max-w-6xl p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Claim Store</h1>
          <p className="mt-1 text-sm opacity-80">
            Inspect per-project cNFT counters and reset campaigns before launch.
          </p>
          {backend ? (
            <p className="mt-1 text-xs opacity-60">
              Backend: <span className="font-mono">{backend}</span>
            </p>
          ) : null}
        </header>

        {/* Admin key */}
        <section className="mb-6 rounded-xl border border-white/10 bg-black/20 p-4">
          <label className="text-sm font-semibold">Admin key</label>
          <p className="mb-2 mt-1 text-xs opacity-70">
            Sent as <code>Authorization: Bearer …</code>. Stored only in this tab&apos;s sessionStorage.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="password"
              className="input input-bordered flex-1 border-white/20 bg-black/40 font-mono text-sm"
              placeholder="CLAIM_ADMIN_KEY"
              value={adminKey}
              onChange={(e) => {
                setAdminKey(e.target.value);
                setKeyDirty(true);
              }}
            />
            <button
              type="button"
              className="btn btn-sm border border-white/20 bg-black/40"
              onClick={() => {
                persistKey(adminKey);
                setKeyDirty(false);
                fetchProjects();
              }}
              disabled={!adminKey}
            >
              {keyDirty ? "Save & load" : "Reload"}
            </button>
            <button
              type="button"
              className="btn btn-sm border border-white/20 bg-black/40"
              onClick={() => {
                setAdminKey("");
                persistKey("");
                setProjects([]);
                setDetail(null);
              }}
            >
              Clear
            </button>
          </div>
        </section>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Projects list */}
          <section className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Projects</h2>
              <button
                type="button"
                className="btn btn-xs border border-white/20 bg-black/40"
                onClick={fetchProjects}
                disabled={!adminKey || loading}
              >
                Refresh
              </button>
            </div>
            {projects.length === 0 ? (
              <p className="text-sm opacity-60">
                {adminKey
                  ? "No projects in store yet. They appear after the first claim."
                  : "Enter the admin key to load projects."}
              </p>
            ) : (
              <table className="table w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th>Project</th>
                    <th className="text-right">Next #</th>
                    <th className="text-right">Claims</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.projectId} className="border-b border-white/5">
                      <td className="font-mono">{p.projectId}</td>
                      <td className="text-right">{p.nextIndex ?? "—"}</td>
                      <td className="text-right">{p.claimsCount}</td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="btn btn-xs border border-white/20 bg-black/40"
                          onClick={() => setSelectedId(p.projectId)}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Detail view */}
          <section className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h2 className="mb-3 text-lg font-semibold">Project detail</h2>
            {!selectedId || !detail || !detail.success ? (
              <p className="text-sm opacity-60">Select a project to inspect.</p>
            ) : (
              <>
                <p className="text-sm">
                  <span className="opacity-70">projectId:</span>{" "}
                  <span className="font-mono">{detail.projectId}</span>
                </p>
                <p className="text-sm">
                  <span className="opacity-70">next #:</span> {detail.stats.nextIndex ?? "—"}
                </p>
                <p className="text-sm">
                  <span className="opacity-70">claims:</span> {detail.stats.claimsCount}
                </p>
                <div className="mt-3">
                  <p className="mb-1 text-sm font-semibold">Claimed wallets</p>
                  <div className="max-h-72 overflow-auto rounded-lg border border-white/10 bg-black/30 p-2">
                    {(detail.wallets || []).length === 0 ? (
                      <p className="text-xs opacity-60">No wallets yet.</p>
                    ) : (
                      <ul className="space-y-1 text-xs font-mono">
                        {(detail.wallets || []).map((w) => (
                          <li key={w} className="break-all">
                            {w}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>

        {/* Reset */}
        <section className="mt-6 rounded-xl border border-amber-400/30 bg-amber-500/5 p-4">
          <h2 className="text-lg font-semibold text-amber-300">Reset project</h2>
          <p className="mt-1 text-xs opacity-80">
            Use BEFORE launching a campaign. Doing this after the first real claim risks duplicating
            on-chain #N.
          </p>
          <form onSubmit={submitReset} className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">Project ID</label>
              <input
                list="claim-store-project-ids"
                className="input input-bordered mt-1 w-full border-white/20 bg-black/40 font-mono text-sm"
                value={resetForm.projectId}
                onChange={(e) =>
                  setResetForm((s) => ({ ...s, projectId: e.target.value }))
                }
                placeholder="unifygenesispromo"
              />
              <datalist id="claim-store-project-ids">
                {projectIdsForDatalist.map((id) => (
                  <option key={id} value={id} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-sm font-semibold">Set next index (optional)</label>
              <input
                type="number"
                min={0}
                className="input input-bordered mt-1 w-full border-white/20 bg-black/40 font-mono text-sm"
                value={resetForm.nextIndex}
                onChange={(e) =>
                  setResetForm((s) => ({ ...s, nextIndex: e.target.value }))
                }
                placeholder="leave blank to delete counter"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={resetForm.resetCounter}
                onChange={(e) =>
                  setResetForm((s) => ({ ...s, resetCounter: e.target.checked }))
                }
              />
              Reset counter
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={resetForm.resetClaims}
                onChange={(e) =>
                  setResetForm((s) => ({ ...s, resetClaims: e.target.checked }))
                }
              />
              Clear claimed wallets
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="btn btn-sm bg-amber-400 text-black hover:bg-amber-300"
                disabled={!adminKey || loading}
              >
                {loading ? "Working…" : "Reset project"}
              </button>
              {resetMessage ? (
                <span className="ml-3 text-xs text-emerald-300">{resetMessage}</span>
              ) : null}
            </div>
          </form>
        </section>
      </main>
    </>
  );
};

export default ClaimStorePage;
