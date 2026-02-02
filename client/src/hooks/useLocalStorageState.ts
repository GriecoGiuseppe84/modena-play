import { useEffect, useMemo, useState } from 'react';

export default function useLocalStorageState<T>(key: string, initialValue: T) {
  const isBrowser = typeof window !== 'undefined' && typeof localStorage !== 'undefined';

  const read = useMemo(() => {
    return () => {
      if (!isBrowser) return initialValue;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return initialValue;
        return JSON.parse(raw) as T;
      } catch {
        return initialValue;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const [value, setValue] = useState<T>(() => read());

  useEffect(() => {
    setValue(read());
  }, [read]);

  useEffect(() => {
    if (!isBrowser) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }, [isBrowser, key, value]);

  return [value, setValue] as const;
}
