import { useState, useEffect, useCallback, useRef } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  refetch: () => void;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setState({ data: result, loading: false, error: null });
      }
    } catch (err: unknown) {
      if (mountedRef.current) {
        const message =
          err && typeof err === 'object' && 'message' in err
            ? (err as { message: string }).message
            : 'An unexpected error occurred';
        setState({ data: null, loading: false, error: message });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  return {
    ...state,
    refetch: fetchData,
  };
}

export default useApi;
