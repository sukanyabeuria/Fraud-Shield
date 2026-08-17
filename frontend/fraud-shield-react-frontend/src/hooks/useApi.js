import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Generic data-fetching hook for real backend calls.
 *
 * Returns { data, error, loading, refetch }.
 * On failure `data` stays null — the hook NEVER substitutes placeholder data.
 *
 * @param {(opts:{signal:AbortSignal}) => Promise<any>} fetcher
 * @param {Array} deps  re-run when these change
 */
export function useApi(fetcher, deps = [], { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [nonce, setNonce] = useState(0);
  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError(null);

    fetcherRef
      .current({ signal: controller.signal })
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((err) => {
        if (!active || controller.signal.aborted) return;
        setData(null);
        setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce, enabled]);

  return { data, error, loading, refetch };
}

/**
 * Hook for imperative actions (form submissions).
 * Returns { run, data, error, loading, reset }.
 */
export function useApiAction(action) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const actionRef = useRef(action);
  actionRef.current = action;

  const run = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await actionRef.current(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { run, data, error, loading, reset };
}

export default useApi;
