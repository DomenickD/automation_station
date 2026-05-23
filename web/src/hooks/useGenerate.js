import { useCallback } from "react";
import { useGenerationQueue } from "./useGenerationQueue";

export function useGenerate(endpoint) {
  const { enqueue, states, patch } = useGenerationQueue();
  const state = states[endpoint] || { status: "idle" };

  const generate = useCallback(
    (inputData) => {
      enqueue(endpoint, endpoint, { input_data: inputData });
    },
    [enqueue, endpoint]
  );

  const regenerate = useCallback(
    (documentId, inputData = null) => {
      const url = `/documents/${documentId}/regenerate`;
      const payload = inputData ? { input_data: inputData } : {};
      enqueue(endpoint, url, payload);
    },
    [enqueue, endpoint]
  );

  const setResult = useCallback(
    (result) => {
      patch(endpoint, { status: "done", result, error: null });
    },
    [patch, endpoint]
  );

  return {
    generate,
    regenerate,
    loading: state.status === "pending" || state.status === "running",
    result: state.result || null,
    error: state.status === "error" ? state.error : null,
    setResult,
  };
}
