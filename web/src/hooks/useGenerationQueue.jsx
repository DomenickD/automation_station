import { createContext, useCallback, useContext, useRef, useState } from "react";
import client from "../api/client";

const Ctx = createContext(null);

export function GenerationQueueProvider({ children }) {
  // { [stateKey]: { status: "idle"|"pending"|"running"|"done"|"error", result, error } }
  const [states, setStates] = useState({});
  const queueRef = useRef([]);
  const runningRef = useRef(false);
  const runningKeyRef = useRef(null);
  const counterRef = useRef(0);

  function patch(stateKey, update) {
    setStates((s) => ({ ...s, [stateKey]: { ...(s[stateKey] || {}), ...update } }));
  }

  const drain = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    while (queueRef.current.length > 0) {
      const job = queueRef.current.shift();
      runningKeyRef.current = job.stateKey;
      patch(job.stateKey, { status: "running" });

      try {
        const res = await client.post(job.url, job.payload);
        patch(job.stateKey, { status: "done", result: res.data, error: null });
      } catch (err) {
        const msg = err.response?.data?.detail || "Generation failed. Please try again.";
        patch(job.stateKey, { status: "error", error: msg, result: null });
      }

      runningKeyRef.current = null;
    }

    runningRef.current = false;
  }, []);

  const enqueue = useCallback(
    (stateKey, url, payload) => {
      counterRef.current += 1;
      patch(stateKey, { status: "pending", error: null });

      // If there's already a pending (not yet running) job for this key, replace it
      // so the user doesn't wait for a stale request they've already superseded.
      const pendingIdx = queueRef.current.findIndex(
        (j) => j.stateKey === stateKey && j.stateKey !== runningKeyRef.current
      );
      const newJob = { id: counterRef.current, stateKey, url, payload };
      if (pendingIdx !== -1) {
        queueRef.current[pendingIdx] = newJob;
      } else {
        queueRef.current.push(newJob);
      }

      drain();
    },
    [drain]
  );

  const clearResult = useCallback((stateKey) => {
    setStates((s) => {
      const next = { ...s };
      delete next[stateKey];
      return next;
    });
  }, []);

  const activeCount = Object.values(states).filter(
    (s) => s.status === "pending" || s.status === "running"
  ).length;

  return (
    <Ctx.Provider value={{ enqueue, states, clearResult, activeCount, patch }}>
      {children}
    </Ctx.Provider>
  );
}

export function useGenerationQueue() {
  return useContext(Ctx);
}
