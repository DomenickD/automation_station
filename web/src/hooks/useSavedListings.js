import { useState, useEffect, useCallback } from "react";
import client from "../api/client";

export function useSavedListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get("/listings");
      setListings(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load saved listings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  async function createOrUpdateListing(data) {
    const res = await client.post("/listings", data);
    await fetchListings();
    return res.data;
  }

  async function updateListing(id, data) {
    const res = await client.put(`/listings/${id}`, data);
    setListings((prev) => prev.map((l) => (l.id === id ? res.data : l)));
    return res.data;
  }

  async function deleteListing(id) {
    await client.delete(`/listings/${id}`);
    setListings((prev) => prev.filter((l) => l.id !== id));
  }

  return { listings, loading, error, fetchListings, createOrUpdateListing, updateListing, deleteListing };
}
