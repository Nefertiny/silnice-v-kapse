import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { newAccident, type Accident } from './accident';
import { deletePhotos } from './accidentFiles';
import { loadJson, saveJson } from './storage';

const ACCIDENT_KEY = 'accident.v1';

type AccidentContextValue = {
  ready: boolean;
  /** Rozpracovaná nehoda. Zůstane uložená, i když se appka zavře. */
  accident: Accident | null;
  start: () => Accident;
  update: (change: (current: Accident) => Accident) => void;
  /** Smaže nehodu i její fotky. */
  discard: () => void;
};

const AccidentContext = createContext<AccidentContextValue | null>(null);

export function AccidentProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [accident, setAccident] = useState<Accident | null>(null);
  // Poslední stav i pro změny, které přijdou rychle po sobě (fotka a text v jednom kroku).
  const latest = useRef<Accident | null>(null);

  useEffect(() => {
    loadJson<Accident | null>(ACCIDENT_KEY, null).then((stored) => {
      latest.current = stored;
      setAccident(stored);
      setReady(true);
    });
  }, []);

  const store = useCallback((value: Accident | null) => {
    latest.current = value;
    setAccident(value);
    saveJson(ACCIDENT_KEY, value).catch(() => {});
  }, []);

  const start = useCallback(() => {
    const fresh = newAccident();
    store(fresh);
    return fresh;
  }, [store]);

  const update = useCallback((change: (current: Accident) => Accident) => store(change(latest.current ?? newAccident())), [store]);

  const discard = useCallback(() => {
    if (latest.current) deletePhotos(latest.current.photos.map((p) => p.uri));
    store(null);
  }, [store]);

  const value = useMemo(() => ({ ready, accident, start, update, discard }), [ready, accident, start, update, discard]);
  return <AccidentContext.Provider value={value}>{children}</AccidentContext.Provider>;
}

export function useAccident(): AccidentContextValue {
  const ctx = useContext(AccidentContext);
  if (!ctx) throw new Error('useAccident musí být uvnitř AccidentProvider');
  return ctx;
}
