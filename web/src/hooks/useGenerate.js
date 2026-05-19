import { useEffect, useState } from "react";
import client from "../api/client";

export function useGenerate(endpoint) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(false);
    setResult(null);
    setError(null);
  }, [endpoint]);

  async function generate(inputData) {
    setLoading(true);
    setError(null);
    try {
      const res = await client.post(endpoint, { input_data: inputData });
      setResult(res.data);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail || "Generation failed. Please try again.";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function regenerate(documentId, inputData = null) {
    setLoading(true);
    setError(null);
    try {
      const payload = inputData ? { input_data: inputData } : {};
      const res = await client.post(`/documents/${documentId}/regenerate`, payload);
      setResult(res.data);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.detail || "Regeneration failed.";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { generate, regenerate, loading, result, error, setResult };
}
