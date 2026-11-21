import { useCallback, useEffect, useRef, useState } from "react";

const IDLE_STATE = { status: "idle", plan: null, result: null, error: null };

// State machine for one agent run. Callbacks read refs so they always act on
// the latest state and runAgent, even when that function arrives in a later
// render. Every promise result is guarded by its own AbortSignal.
export default function useAgentRun(runAgent) {
  const [state, setState] = useState(IDLE_STATE);
  const stateRef = useRef(state);
  const runAgentRef = useRef(runAgent);
  const controllerRef = useRef(null);

  stateRef.current = state;
  runAgentRef.current = runAgent;

  const commit = useCallback((nextState) => {
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const start = useCallback(
    (plan) => {
      const current = stateRef.current;
      if (!runAgentRef.current || current.status === "running" || current.status === "awaiting_approval") {
        return;
      }

      const controller = new AbortController();
      const { signal } = controller;
      controllerRef.current = controller;
      commit({ status: "running", plan, result: null, error: null });

      const isCurrent = () => controllerRef.current === controller && !signal.aborted;

      try {
        Promise.resolve(runAgentRef.current(plan, { signal })).then(
          (result) => {
            if (!isCurrent()) return;
            controllerRef.current = null;
            commit({
              status: plan?.risk === "R2" ? "awaiting_approval" : "done",
              plan,
              result,
              error: null,
            });
          },
          (error) => {
            if (!isCurrent()) return;
            controllerRef.current = null;
            commit({ status: "error", plan, result: null, error });
          }
        );
      } catch (error) {
        if (!isCurrent()) return;
        controllerRef.current = null;
        commit({ status: "error", plan, result: null, error });
      }
    },
    [commit]
  );

  const approve = useCallback(() => {
    const current = stateRef.current;
    if (current.status !== "awaiting_approval") return;
    commit({ ...current, status: "done" });
  }, [commit]);

  const reject = useCallback(() => {
    const current = stateRef.current;
    if (current.status === "running") {
      controllerRef.current?.abort();
      controllerRef.current = null;
    } else if (current.status !== "awaiting_approval") {
      return;
    }
    commit(IDLE_STATE);
  }, [commit]);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
      controllerRef.current = null;
    },
    []
  );

  return { ...state, start, approve, reject };
}
