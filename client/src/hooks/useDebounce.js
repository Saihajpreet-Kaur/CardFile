import { useEffect, useState } from 'react';

/** Returns the value only once it has stopped changing for `delay` ms (so fewer API calls are made while typing). */
export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
