import { useEffect, useState } from "react";

// Returns the latest value that has stayed unchanged for `delay` milliseconds.
// The first render uses `value` immediately; later changes are committed by a
// timer that is cancelled on every dependency change and on unmount.
export default function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timerId);
  }, [value, delay]);

  return debouncedValue;
}
