import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { cancelCarReminders, scheduleCarReminders } from './reminders';
import { loadJson, saveJson } from './storage';
import type { Car } from './types';

const CARS_KEY = 'cars.v1';
const PREMIUM_KEY = 'premium.v1';

/** Bez předplatného jde hlídat jedno auto. */
export const FREE_CAR_LIMIT = 1;

type AddResult = { ok: true; car: Car } | { ok: false; reason: 'limit' | 'duplicate' };

type CarsContextValue = {
  ready: boolean;
  cars: Car[];
  premium: boolean;
  setPremium: (value: boolean) => void;
  canAddCar: boolean;
  addCar: (car: Omit<Car, 'id'>) => AddResult;
  /** Bez `reschedule: false` rovnou přeplánuje upozornění (může se zeptat na povolení). */
  updateCar: (id: string, patch: Partial<Car>, opts?: { reschedule?: boolean }) => void;
  removeCar: (id: string) => void;
  getCar: (id: string | undefined) => Car | undefined;
};

const CarsContext = createContext<CarsContextValue | null>(null);

export function normalizeSpz(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

function newId(): string {
  return `car_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function CarsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [cars, setCars] = useState<Car[]>([]);
  const [premium, setPremiumState] = useState(false);
  // Nejnovější seznam i mezi dvěma rychlými změnami za sebou (např. ověřování).
  const carsRef = useRef<Car[]>([]);

  useEffect(() => {
    Promise.all([loadJson<Car[]>(CARS_KEY, []), loadJson<boolean>(PREMIUM_KEY, false)]).then(
      ([storedCars, storedPremium]) => {
        carsRef.current = storedCars;
        setCars(storedCars);
        setPremiumState(storedPremium);
        setReady(true);
      },
    );
  }, []);

  const persist = useCallback((next: Car[]) => {
    carsRef.current = next;
    setCars(next);
    saveJson(CARS_KEY, next);
  }, []);

  const setPremium = useCallback((value: boolean) => {
    setPremiumState(value);
    saveJson(PREMIUM_KEY, value);
  }, []);

  const canAddCar = premium || cars.length < FREE_CAR_LIMIT;

  const addCar = useCallback(
    (input: Omit<Car, 'id'>): AddResult => {
      const spz = normalizeSpz(input.spz);
      const cars = carsRef.current;
      if (cars.some((c) => c.spz.replace(/ /g, '') === spz.replace(/ /g, ''))) {
        return { ok: false, reason: 'duplicate' };
      }
      if (!premium && cars.length >= FREE_CAR_LIMIT) return { ok: false, reason: 'limit' };
      const car: Car = { ...input, spz, id: newId() };
      persist([...cars, car]);
      return { ok: true, car };
    },
    [premium, persist],
  );

  const updateCar = useCallback(
    (id: string, patch: Partial<Car>, opts?: { reschedule?: boolean }) => {
      const next = carsRef.current.map((c) => (c.id === id ? { ...c, ...patch } : c));
      persist(next);
      const updated = next.find((c) => c.id === id);
      if (updated && opts?.reschedule !== false) scheduleCarReminders(updated).catch(() => {});
    },
    [persist],
  );

  const removeCar = useCallback(
    (id: string) => {
      persist(carsRef.current.filter((c) => c.id !== id));
      cancelCarReminders(id).catch(() => {});
    },
    [persist],
  );

  const getCar = useCallback((id: string | undefined) => cars.find((c) => c.id === id), [cars]);

  const value = useMemo(
    () => ({ ready, cars, premium, setPremium, canAddCar, addCar, updateCar, removeCar, getCar }),
    [ready, cars, premium, setPremium, canAddCar, addCar, updateCar, removeCar, getCar],
  );

  return <CarsContext.Provider value={value}>{children}</CarsContext.Provider>;
}

export function useCars(): CarsContextValue {
  const ctx = useContext(CarsContext);
  if (!ctx) throw new Error('useCars musí být uvnitř CarsProvider');
  return ctx;
}
