import { useCallback, useEffect, useState } from "react";

const INITIAL_STATE = { status: "loading", plans: [], error: null };

// Loads plans through the injected `fetchPlans` promise factory.
// Every effect run owns a `cancelled` flag, so stale results (including
// StrictMode's first pass, reloads and unmounts) cannot overwrite state.
export default function usePlans(fetchPlans) {
  const [state, setState] = useState(INITIAL_STATE);
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => {
    setState(INITIAL_STATE);
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState(INITIAL_STATE);

    let request;
    try {
      request = fetchPlans();
    } catch (error) {
      if (!cancelled) setState({ status: "error", plans: [], error });
      return () => {
        cancelled = true;
      };
    }

    Promise.resolve(request).then(
      (plans) => {
        if (!cancelled) setState({ status: "ready", plans, error: null });
      },
      (error) => {
        if (!cancelled) setState({ status: "error", plans: [], error });
      }
    );

    return () => {
      cancelled = true;
    };
  }, [fetchPlans, attempt]);

  return { ...state, reload };
}
