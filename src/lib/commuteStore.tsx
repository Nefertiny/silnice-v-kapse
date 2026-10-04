import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import type { Commute } from './commute';
import { scheduleCommuteReminders } from './reminders';
import { loadJson, saveJson } from './storage';

const COMMUTE_KEY = 'commute.v1';

type CommuteContextValue = {
  ready: boolean;
  commute: Commute | null;
  /** Uloží cestu (null ji smaže) a přeplánuje ranní připomínky. */
  setCommute: (value: Commute | null) => void;
};

const CommuteContext = createContext<CommuteContextValue | null>(null);

export function CommuteProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [commute, setState] = useState<Commute | null>(null);

  useEffect(() => {
    loadJson<Commute | null>(COMMUTE_KEY, null).then((stored) => {
      setState(stored);
      setReady(true);
    });
  }, []);

  const setCommute = useCallback((value: Commute | null) => {
    setState(value);
    saveJson(COMMUTE_KEY, value);
    scheduleCommuteReminders(value).catch(() => {});
  }, []);

  const value = useMemo(() => ({ ready, commute, setCommute }), [ready, commute, setCommute]);
  return <CommuteContext.Provider value={value}>{children}</CommuteContext.Provider>;
}

export function useCommute(): CommuteContextValue {
  const ctx = useContext(CommuteContext);
  if (!ctx) throw new Error('useCommute musí být uvnitř CommuteProvider');
  return ctx;
}
