import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { getDataVersion, subscribeData } from '../services/api';

/** Re-renders whenever a mutation succeeds anywhere in the console. */
export function useDataVersion() {
  return useSyncExternalStore(subscribeData, getDataVersion, getDataVersion);
}

/**
 * Run an async service call and keep the result fresh.
 *   const { data, loading, error, reload } = useQuery(() => getUsers(filters), [key], { refetchInterval });
 * - `loading` is true only until the first result for the current deps arrives (no skeleton flash on refetch).
 * - Refetches when `deps` change and after any successful mutation (api.invalidate()).
 * - `refetchInterval`: ms, or a function (data) => ms | false, for polling while work is in flight.
 * - A failed background refetch keeps the last good data instead of replacing the page with an error.
 */
export function useQuery(fn, deps = [], { refetchInterval } = {}) {
  const version = useDataVersion();
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const reqId = useRef(0);
  const fnRef = useRef(fn); fnRef.current = fn;
  const depsKey = JSON.stringify(deps);
  const loadedKey = useRef(null);

  const run = useCallback(() => {
    const id = ++reqId.current;
    const key = depsKey;
    const fresh = loadedKey.current !== key;
    // keep showing the previous result while new filters / pages load (no skeleton flash)
    setState(s => ({ data: s.data, loading: s.data == null, error: null }));
    Promise.resolve().then(() => fnRef.current()).then(
      data => { if (id === reqId.current) { loadedKey.current = key; setState({ data, loading: false, error: null }); } },
      error => {
        if (id !== reqId.current) return;
        if (!fresh && loadedKey.current === key) setState(s => (s.data != null ? { ...s, loading: false } : { data: null, loading: false, error }));
        else setState({ data: null, loading: false, error });
      }
    );
  }, [depsKey]);

  useEffect(run, [version, run]);

  const interval = typeof refetchInterval === 'function' ? refetchInterval(state.data) : refetchInterval;
  useEffect(() => {
    if (!interval) return undefined;
    const t = window.setInterval(() => { if (!document.hidden) run(); }, interval);
    return () => window.clearInterval(t);
  }, [interval, run]);

  return { ...state, reload: run };
}

/**
 * Wrap a mutation with a pending flag.
 *   const [save, saving] = useMutation(updateUser);
 */
export function useMutation(fn) {
  const [pending, setPending] = useState(false);
  const mutate = useCallback(async (...args) => {
    setPending(true);
    try { return await fn(...args); } finally { setPending(false); }
  }, [fn]);
  return [mutate, pending];
}
