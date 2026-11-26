import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads data from the API and tracks loading and error states.
 *
 *   const { data, loading, error, reload } = useApi(() => contactsApi.get(id), [id]);
 *
 * When the dependencies change quickly (typing in a search box), only the latest
 * response is kept, so an older, slower response can never overwrite newer results.
 */
export function useApi(request, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const latestCall = useRef(0);

  const load = useCallback(async () => {
    const callId = ++latestCall.current;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const data = await request();
      if (callId === latestCall.current) setState({ data, loading: false, error: null });
    } catch (error) {
      if (callId === latestCall.current) setState((previous) => ({ ...previous, loading: false, error }));
    }
    // The caller passes the dependency list (like useEffect does), so it is not an array literal here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  const setData = useCallback((update) => {
    setState((previous) => ({
      ...previous,
      data: typeof update === 'function' ? update(previous.data) : update,
    }));
  }, []);

  return { ...state, reload: load, setData };
}
