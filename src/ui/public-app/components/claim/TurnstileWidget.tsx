import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: { sitekey: string; callback: (token: string) => void; theme?: "auto" | "light" | "dark" }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileWidgetProps = {
  siteKey: string;
  onToken: (token: string) => void;
};

/**
 * Lightweight wrapper for Cloudflare Turnstile.
 * Renders nothing (and is a no-op) if `siteKey` is empty, so the claim flow
 * works whether or not Turnstile is configured.
 */
export function TurnstileWidget({ siteKey, onToken }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;

    const ensureScript = (): Promise<void> =>
      new Promise((resolve, reject) => {
        if (window.turnstile) return resolve();
        const existing = document.querySelector(`script[src^="${SCRIPT_SRC.split("?")[0]}"]`);
        if (existing) {
          existing.addEventListener("load", () => resolve());
          existing.addEventListener("error", () => reject(new Error("Turnstile script failed")));
          return;
        }
        const s = document.createElement("script");
        s.src = SCRIPT_SRC;
        s.async = true;
        s.defer = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Turnstile script failed"));
        document.head.appendChild(s);
      });

    ensureScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onToken(token),
          theme: "auto",
        });
      })
      .catch(() => {
        // Swallow; user can still attempt claim, and server will reject without token if enforced.
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* noop */
        }
      }
    };
  }, [siteKey, onToken]);

  if (!siteKey) return null;
  return <div ref={containerRef} className="mt-2" />;
}
