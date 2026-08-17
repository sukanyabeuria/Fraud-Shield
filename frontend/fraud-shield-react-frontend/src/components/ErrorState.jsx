import { AlertTriangle, PlugZap, RefreshCw, ServerCrash, ShieldOff, Timer } from "lucide-react";
import Button from "./Button";
import { API_BASE_URL } from "../config/api";
import { ERROR_KIND } from "../services/httpClient";
import { cn } from "../utils/cn";

const PRESETS = {
  [ERROR_KIND.NETWORK]: {
    icon: PlugZap,
    title: "Unable to connect to Fraud-Shield backend",
    hint: `No response from ${API_BASE_URL}. Start the API with: python -m uvicorn app.main:app --reload`,
  },
  [ERROR_KIND.TIMEOUT]: {
    icon: Timer,
    title: "The backend took too long to respond",
    hint: "The request timed out. The ML model may still be loading — try again in a moment.",
  },
  [ERROR_KIND.VALIDATION]: {
    icon: AlertTriangle,
    title: "Invalid transaction data",
    hint: "The backend rejected the request payload. Check the highlighted fields and try again.",
  },
  [ERROR_KIND.NOT_FOUND]: {
    icon: ShieldOff,
    title: "This endpoint is not available on the backend",
    hint: "The API route returned 404. Implement it in FastAPI, or update the path in src/config/api.js.",
  },
  [ERROR_KIND.AUTH]: {
    icon: ShieldOff,
    title: "Not authorised",
    hint: "The backend rejected these credentials or the session has expired.",
  },
  [ERROR_KIND.SERVER]: {
    icon: ServerCrash,
    title: "The backend reported an error",
    hint: "This is usually a database or ML service failure. Check the uvicorn console output.",
  },
  [ERROR_KIND.PARSE]: {
    icon: AlertTriangle,
    title: "Unexpected response from the backend",
    hint: "The response did not match the expected schema. Check the endpoint's Pydantic response model.",
  },
};

/**
 * Real error state. Rendered whenever a backend call fails.
 * This component intentionally shows NO data — the app must never look like it
 * is working when the backend is unavailable.
 */
export default function ErrorState({ error, onRetry, compact = false, className, title }) {
  const kind = error?.kind ?? ERROR_KIND.HTTP;
  const preset = PRESETS[kind] ?? {
    icon: AlertTriangle,
    title: "Something went wrong",
    hint: "The request to the backend did not succeed.",
  };
  const Icon = preset.icon;
  const message = error?.message && error.message !== preset.title ? error.message : null;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-3 text-xs text-rose-200",
          className
        )}
      >
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-rose-300">{title ?? preset.title}</p>
          {message && <p className="mt-0.5 break-words text-rose-200/80">{message}</p>}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="shrink-0 rounded-lg p-1 text-rose-300 hover:bg-rose-500/15"
            aria-label="Retry"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-[260px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-rose-500/25 bg-rose-500/[0.04] p-8 text-center",
        className
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/12 text-rose-300">
        <Icon className="h-7 w-7" />
      </div>
      <div className="max-w-md">
        <h3 className="text-base font-semibold text-white">{title ?? preset.title}</h3>
        {message && <p className="mt-1.5 break-words text-sm text-rose-200/90">{message}</p>}
        <p className="mt-2 text-xs leading-relaxed text-slate-500">{preset.hint}</p>
        {error?.status && (
          <p className="mt-2 font-mono text-[11px] text-slate-600">
            HTTP {error.status}
            {error.url ? ` · ${error.url}` : ""}
          </p>
        )}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry} className="mt-1">
          Try again
        </Button>
      )}
    </div>
  );
}

/** Neutral empty state for when the backend legitimately returns zero rows. */
export function EmptyState({ title = "No data yet", hint, icon: Icon = ShieldOff, className }) {
  return (
    <div
      className={cn(
        "flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 p-8 text-center",
        className
      )}
    >
      <Icon className="h-7 w-7 text-slate-600" />
      <p className="text-sm font-medium text-slate-400">{title}</p>
      {hint && <p className="max-w-sm text-xs text-slate-600">{hint}</p>}
    </div>
  );
}
