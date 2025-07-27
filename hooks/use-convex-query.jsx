import { useQuery, useMutation } from "convex/react";
import { useState, useEffect } from "react";
import { toast } from "sonner";


/* ──────────────────────────────────────────────────────────────────────────
   useConvexQuery - Enhanced query hook with loading states and error handling
   ──────────────────────────────────────────────────────────────────────── */
export const useConvexQuery = (query, ...args) => {
  const result = useQuery(query, ...args);
  const [data, setData] = useState(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ── handle query result state changes ─────────────────────────────────── */
  /*
      Track Convex query state and update local state accordingly
      - undefined result = still loading
      - defined result = success, update data
      - catch any processing errors and show toast
  */
  useEffect(() => {
    if (result === undefined) {
      setIsLoading(true);
    } else {
      try {
        setData(result);
        setError(null);
      } catch (err) {
        setError(err);
        toast.error(err.message);
      } finally {
        setIsLoading(false);
      }
    }
  }, [result]);

  return {
    data,
    isLoading,
    error,
  };
};

/* ──────────────────────────────────────────────────────────────────────────
   useConvexMutation - Enhanced mutation hook with loading states and error handling
   ──────────────────────────────────────────────────────────────────────── */
export const useConvexMutation = (mutation) => {
  const mutationFn = useMutation(mutation);
  const [data, setData] = useState(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ── mutation wrapper with state management ─────────────────────────────── */
  /*
      Wraps Convex mutation with loading/error states
      - Set loading true before mutation
      - Store response data on success
      - Show error toast and re-throw on failure
      - Always set loading false when done
  */
  const mutate = async (...args) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await mutationFn(...args);
      setData(response);
      return response;
    } catch (err) {
      setError(err);
      toast.error(err.message);
      throw err; // re-throw so caller can handle if needed
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, data, isLoading, error };
};