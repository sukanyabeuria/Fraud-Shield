import { useEffect, useState } from "react";
import { getHealth } from "../services/fraudApi";
import { API_BASE_URL } from "../config/api";
import { cn } from "../utils/cn";

/**
 * Live backend connectivity indicator.
 * Polls the REAL GET /api/v1/health endpoint — no simulated status.
 */
export default function BackendStatus({ className, intervalMs = 30000 }) {
  const [state, setState] = useState({ status: "checking", data: null, error: null });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const check = async () => {
      try {
        const data = await getHealth({ signal: controller.signal });
        if (active) setState({ status: "online", data, error: null });
      } catch (err) {
        if (active && !controller.signal.aborted) {
          setState({ status: "offline", data: null, error: err });
        }
      }
    };

    check();
    const timer = setInterval(check, intervalMs);
    return () => {
      active = false;
      controller.abort();
      clearInterval(timer);
    };
  }, [intervalMs]);

  const { status, data } = state;
  const online = status === "online";
  const checking = status === "checking";

  // Show whatever detail the backend's health payload actually provides.
  const detail = (() => {
    if (checking) return "Contacting backend…";
    if (!online) return `No response from ${API_BASE_URL}`;
    if (!data || typeof data !== "object") return API_BASE_URL;
    const parts = [];
    const version = data.version ?? data.app_version ?? data.api_version;
    const model = data.model_version ?? data.model ?? data.ml_model;
    const db = data.database ?? data.db ?? data.database_status;
    if (model) parts.push(String(model));
    if (version) parts.push(`v${String(version).replace(/^v/, "")}`);
    if (db) parts.push(`db: ${String(db)}`);
    return parts.length ? parts.join(" · ") : API_BASE_URL;
  })();

  return (
    <div
      className={cn(
        "mx-3 mb-3 rounded-xl border p-3.5 transition-colors",
        online
          ? "border-white/8 bg-gradient-to-br from-sky-500/10 to-transparent"
          : checking
            ? "border-white/8 bg-white/[0.03]"
            : "border-rose-500/25 bg-rose-500/[0.07]",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          {online && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              online ? "bg-emerald-400" : checking ? "bg-slate-500" : "bg-rose-500"
            )}
          />
        </span>
        <p
          className={cn(
            "text-xs font-semibold",
            online ? "text-slate-200" : checking ? "text-slate-400" : "text-rose-300"
          )}
        >
          {online ? "Backend Online" : checking ? "Checking…" : "Backend Offline"}
        </p>
      </div>
      <p className="mt-1.5 break-words text-[11px] leading-relaxed text-slate-500">{detail}</p>
    </div>
  );
}
