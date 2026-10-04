import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, View } from 'react-native';

import { DateStepper } from '@/components/DateStepper';
import { InsuranceEditor } from '@/components/InsuranceEditor';
import { deadlineLook } from '@/components/deadlineUi';
import { Icon } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { BackHeader, Body, GlassCard, IconButton, Plate, PrimaryButton, SecondaryButton } from '@/components/ui';
import { useCars } from '@/lib/cars';
import { carDeadlines, daysUntil } from '@/lib/dates';
import { HiddenLookup, type HiddenLookupHandle } from '@/lib/lookup/HiddenLookup';
import { parseLookup, type LookupOutcome } from '@/lib/lookup/parse';
import { SOURCES, type LookupEvent } from '@/lib/lookup/sources';
import { scheduleCarReminders } from '@/lib/reminders';
import type { Car, DeadlineKind, LookupSourceId } from '@/lib/types';
import { fetchVehicle, vehicleApiConfigured } from '@/lib/vehicleApi';
import { colors, fonts } from '@/theme';

type StepId = 'api' | LookupSourceId;
type Phase = 'running' | 'captcha-image' | 'captcha-widget' | 'checking';

const STEP_COVERS: Record<StepId, DeadlineKind[]> = {
  api: ['vignette', 'stk'],
  edalnice: ['vignette'],
  overeniauta: ['stk'],
  tachometr: ['stk'],
  // Policie se tu nevolá, patří k prověření ojetiny.
  policie: [],
};

const FIELD: Record<DeadlineKind, 'vignetteUntil' | 'stkUntil' | 'insuranceUntil'> = {
  vignette: 'vignetteUntil',
  stk: 'stkUntil',
  insurance: 'insuranceUntil',
};

/** Na první odpověď webu čekáme nejdéle tak dlouho, pak to vzdáme a nabídneme ruční zadání. */
const STEP_TIMEOUT_MS = 25000;

function stkValid(car: Partial<Car>): boolean {
  return !!car.stkUntil && daysUntil(car.stkUntil) >= 0;
}

function initialQueue(car?: Car): StepId[] {
  if (!car) return [];
  const q: StepId[] = [];
  if (vehicleApiConfigured()) q.push('api');
  else {
    if (car.type !== 'motorka') q.push('edalnice');
    q.push('overeniauta');
  }
  // VIN od uživatele: STK zkusíme i podle něj. Když ji najde dřívější krok, tenhle vyřadíme.
  if (car.vin && !stkValid(car)) q.push('tachometr');
  // Povinné ručení se automaticky nezjišťuje (ČKP je jen pro poškozené), klient ho zadá sám.
  return q;
}

function patchFrom(outcome: LookupOutcome): Partial<Car> | null {
  switch (outcome.kind) {
    case 'vignette':
      if (outcome.exempt) return { vignetteExempt: true };
      return outcome.until ? { vignetteUntil: outcome.until, vignetteExempt: false } : { vignetteExempt: false };
    case 'stk':
      return { stkUntil: outcome.estimatedUntil };
    case 'vehicle':
      return { vin: outcome.vin, stkUntil: outcome.stkUntil };
    default:
      return null;
  }
}

/** Zahodí prázdné hodnoty a nepřepíše VIN, který už u auta je (třeba zadaný uživatelem). */
function clean(patch: Partial<Car>, current: Car): Partial<Car> {
  return Object.fromEntries(
    Object.entries(patch).filter(([k, v]) => v !== undefined && !(k === 'vin' && current.vin)),
  ) as Partial<Car>;
}

export default function Verify() {
  const { carId } = useLocalSearchParams<{ carId: string }>();
  const { getCar, updateCar } = useCars();
  const car = getCar(carId);

  const [queue, setQueue] = useState<StepId[]>(() => initialQueue(car));
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('running');
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [editing, setEditing] = useState<DeadlineKind | null>(null);
  const [failed, setFailed] = useState<DeadlineKind[]>([]);
  const lookup = useRef<HiddenLookupHandle>(null);
  const carRef = useRef(car);
  useEffect(() => {
    carRef.current = car;
  }, [car]);

  const step: StepId | undefined = queue[index];
  const finished = index >= queue.length;
  const isLookup = !!step && step !== 'api';
  const source = isLookup ? SOURCES[step as LookupSourceId] : null;

  const next = useCallback((failedKinds: DeadlineKind[] = []) => {
    if (failedKinds.length) setFailed((f) => [...f, ...failedKinds]);
    setIndex((i) => i + 1);
    setPhase('running');
    setCaptcha(null);
    setCode('');
  }, []);

  /** Za aktuální krok vloží nové kroky a z dalších vyřadí ty, které už nejsou potřeba. */
  const planAfterCurrent = useCallback(
    (insert: StepId[], drop: StepId[] = []) =>
      setQueue((q) => [
        ...q.slice(0, index + 1),
        ...insert.filter((s) => !q.includes(s)),
        ...q.slice(index + 1).filter((s) => !drop.includes(s)),
      ]),
    [index],
  );

  // Krok 1: náš server (Autokuk) podle SPZ.
  useEffect(() => {
    if (step !== 'api' || !carRef.current) return;
    let cancelled = false;
    const current = carRef.current;
    fetchVehicle(current.spz.replace(/ /g, '')).then((info) => {
      if (cancelled) return;
      const patch = info ? clean({ ...info }, current) : {};
      if (Object.keys(patch).length) updateCar(current.id, patch, { reschedule: false });
      const merged = { ...current, ...patch };
      const fallbacks: StepId[] = [];
      if (!merged.vignetteUntil && !merged.vignetteExempt && merged.type !== 'motorka') fallbacks.push('edalnice');
      if (!merged.stkUntil) fallbacks.push('overeniauta');
      planAfterCurrent(fallbacks, stkValid(merged) ? ['tachometr'] : []);
      next();
    });
    return () => {
      cancelled = true;
    };
  }, [step, updateCar, planAfterCurrent, next]);

  // Když web dlouho mlčí, krok přeskočíme.
  useEffect(() => {
    if (!isLookup || (phase !== 'running' && phase !== 'checking')) return;
    const t = setTimeout(() => next(STEP_COVERS[step!]), STEP_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [isLookup, phase, step, index, next]);

  const onResult = (text: string) => {
    const current = carRef.current;
    if (!current || !step || step === 'api') return;
    const outcome = parseLookup(step, text);
    if (outcome.kind === 'wrong-code') {
      setNote('Kód nesouhlasil, tady je nový.');
      setPhase('running');
      setCode('');
      lookup.current?.reload();
      return;
    }
    const patch = patchFrom(outcome);
    const cleaned = patch ? clean(patch, current) : {};
    if (Object.keys(cleaned).length) updateCar(current.id, cleaned, { reschedule: false });
    const merged = { ...current, ...cleaned };
    if (stkValid(merged)) planAfterCurrent([], ['tachometr']);
    else if (step === 'overeniauta' && merged.vin) planAfterCurrent(['tachometr']);
    const covered = STEP_COVERS[step].filter((k) => !merged[FIELD[k]] && !(k === 'vignette' && merged.vignetteExempt));
    setNote(null);
    next(covered);
  };

  const onEvent = (e: LookupEvent) => {
    switch (e.type) {
      case 'captcha-image':
        setCaptcha(e.image);
        setPhase('captcha-image');
        break;
      case 'captcha-widget':
        setPhase('captcha-widget');
        break;
      case 'checking':
        setPhase('checking');
        break;
      case 'result':
        onResult(e.text);
        break;
      case 'unsupported':
        setNote('Ověření z oficiálních webů běží jen v telefonu. Tady můžete data doplnit ručně.');
        next(step ? STEP_COVERS[step] : []);
        break;
      case 'error':
        next(step ? STEP_COVERS[step] : []);
        break;
    }
  };

  if (!car) {
    return (
      <Screen>
        <BackHeader title="Ověření" />
        <Body muted>Auto jsme nenašli.</Body>
      </Screen>
    );
  }

  const lookupValue = source?.query === 'vin' ? car.vin ?? '' : car.spz.replace(/ /g, '');
  const runningKinds = !finished && step ? STEP_COVERS[step] : [];

  const finish = async () => {
    await scheduleCarReminders(car).catch(() => 0);
    router.replace('/');
  };

  return (
    <Screen>
      <BackHeader title="Ověřujeme auto" />
      <Plate spz={car.spz} size="s" />

      <GlassCard style={{ gap: 0, paddingVertical: 4 }}>
        {carDeadlines(car).map((d, i) => {
          const known = d.state !== 'unknown';
          const running = !known && runningKinds.includes(d.kind);
          const look = deadlineLook(d, d.kind === 'insurance' ? car.insurer : undefined);
          const subtitle = known
            ? look.subtitle
            : running
              ? `Ověřujeme · ${source?.provider ?? 'registr vozidel'}`
              : d.kind === 'insurance'
                ? 'Zadejte pojišťovnu a výročí ze smlouvy'
                : failed.includes(d.kind) || finished
                  ? 'Nepodařilo se zjistit, zadejte ručně'
                  : 'Čeká na ověření';
          return (
            <View key={d.kind} style={[styles.row, i > 0 && styles.divider]}>
              <View style={styles.status}>
                {known ? (
                  <View style={styles.ok}>
                    <Icon name="check" size={16} color={colors.ok} strokeWidth={2.6} />
                  </View>
                ) : running ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <View style={styles.todo} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{d.title}</Text>
                <Text style={styles.small}>{subtitle}</Text>
              </View>
              {!running && (
                <SecondaryButton
                  style={styles.smallButton}
                  label={known ? 'Upravit' : 'Zadat'}
                  onPress={() => setEditing(d.kind)}
                />
              )}
            </View>
          );
        })}
      </GlassCard>

      {editing === 'insurance' && (
        <InsuranceEditor
          car={car}
          onCancel={() => setEditing(null)}
          onSave={(patch) => {
            updateCar(car.id, patch, { reschedule: false });
            setEditing(null);
          }}
        />
      )}

      {editing && editing !== 'insurance' && (
        <DateStepper
          title={editing === 'vignette' ? 'Dálniční známka platí do' : 'STK platí do'}
          initial={car[FIELD[editing]]}
          onCancel={() => setEditing(null)}
          onSave={(iso) => {
            // Ručně zadané datum známky ruší i dřívější „osvobozeno“.
            updateCar(car.id, { [FIELD[editing]]: iso, ...(editing === 'vignette' ? { vignetteExempt: false } : {}) }, { reschedule: false });
            setEditing(null);
          }}
        />
      )}

      {note && <Body muted>{note}</Body>}

      {isLookup && phase === 'captcha-image' && captcha && (
        <GlassCard tone="accent">
          <Text style={styles.cardTitle}>Poslední krok: opište kód</Text>
          <Body muted>Tuhle kontrolu vyžaduje {source?.provider}. Zabere pár vteřin.</Body>
          <View style={styles.captchaRow}>
            <View style={styles.captchaBox}>
              <Image source={{ uri: captcha }} style={styles.captcha} resizeMode="contain" accessibilityLabel="Kontrolní obrázek" />
            </View>
            <IconButton icon="refresh" label="Jiný obrázek" onPress={() => lookup.current?.refresh()} />
          </View>
          <TextInput
            accessibilityLabel="Kód z obrázku"
            value={code}
            onChangeText={setCode}
            placeholder="Kód z obrázku"
            placeholderTextColor={colors.faint}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.codeInput}
          />
          <PrimaryButton
            label="Potvrdit"
            disabled={!code.trim()}
            onPress={() => {
              lookup.current?.submit(code.trim());
              setPhase('checking');
            }}
          />
        </GlassCard>
      )}

      {isLookup && (
        <View>
          {phase === 'captcha-widget' && (
            <View style={{ gap: 8, marginBottom: 10 }}>
              <Text style={styles.cardTitle}>Potvrďte kontrolu {source?.provider}</Text>
              <Body muted>Tuhle kontrolu nejde zobrazit jinak, ukazujeme ji tak, jak ji poslal web.</Body>
            </View>
          )}
          <HiddenLookup
            key={`${step}-${index}`}
            ref={lookup}
            source={source!}
            value={lookupValue}
            showWidget={phase === 'captcha-widget'}
            onEvent={onEvent}
          />
          {phase === 'captcha-widget' && (
            <PrimaryButton
              style={{ marginTop: 10 }}
              label="Hotovo, pokračovat"
              onPress={() => {
                lookup.current?.submit('');
                setPhase('checking');
              }}
            />
          )}
        </View>
      )}

      {!finished && isLookup && (
        <SecondaryButton label="Přeskočit tento krok" onPress={() => next(STEP_COVERS[step!])} />
      )}

      {finished && (
        <GlassCard tone="ok">
          <Text style={styles.cardTitle}>Hotovo, auto hlídáme</Text>
          <Body muted>Ozveme se měsíc, týden a den před koncem každého termínu. Chybějící data můžete doplnit tlačítkem Zadat.</Body>
          <PrimaryButton label="Pokračovat" onPress={finish} />
        </GlassCard>
      )}

      <Text style={styles.footnote}>
        Údaje ověřujete sami ze svého telefonu na webech eDálnice, overeniauta.cz a ministerstva dopravy
        {vehicleApiConfigured() ? ' a u služby Autokuk.cz.' : '.'}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 8 },
  divider: { borderTopWidth: 1, borderTopColor: 'rgba(140,170,220,0.12)' },
  status: { width: 28, alignItems: 'center' },
  ok: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(61,220,151,0.16)', alignItems: 'center', justifyContent: 'center' },
  todo: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,181,71,0.7)' },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  small: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  smallButton: { minHeight: 40, paddingHorizontal: 12, borderRadius: 12 },
  cardTitle: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.text },
  captchaRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  captchaBox: { flex: 1, height: 64, borderRadius: 14, overflow: 'hidden', backgroundColor: '#E9EDF3' },
  captcha: { width: '100%', height: '100%' },
  codeInput: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSolid,
    color: colors.text,
    paddingHorizontal: 16,
    fontFamily: fonts.bodyHeavy,
    fontSize: 22,
    letterSpacing: 6,
  },
  footnote: { fontFamily: fonts.body, fontSize: 11, lineHeight: 16, color: colors.faint, textAlign: 'center' },
});
