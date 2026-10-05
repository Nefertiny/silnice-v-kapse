import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { LookupRunner, type LookupFailure } from '@/components/LookupRunner';
import { MileageChart } from '@/components/MileageChart';
import { Screen } from '@/components/Screen';
import { VIN_HELP, VinField } from '@/components/VinField';
import { BackHeader, Body, GlassCard, PrimaryButton, SecondaryButton, SectionLabel } from '@/components/ui';
import { normalizeSpz } from '@/lib/cars';
import { daysUntil, formatCz } from '@/lib/dates';
import { parseLookup } from '@/lib/lookup/parse';
import { POLICIE_BY_SPZ, SOURCES } from '@/lib/lookup/sources';
import { fmtKm, parseMileage, parseStolen, summarizeMileage, type MileageSummary, type StolenCheck } from '@/lib/usedCar';
import { fetchUsedCar, vehicleApiConfigured, type UsedCarAnswer, type UsedCarReport } from '@/lib/vehicleApi';
import { isValidVin } from '@/lib/vin';
import { colors, fonts, tint } from '@/theme';

type CheckId = 'autokuk' | 'policie' | 'tachometr';
type Stolen = StolenCheck | 'failed';
type Mileage = { kind: 'records'; summary: MileageSummary } | { kind: 'not-found' } | { kind: 'failed' } | { kind: 'skipped' };
/** vin: zadaný, nebo ten, který Autokuk našel podle SPZ. */
type Run = { id: number; queue: CheckId[]; index: number; vin?: string };

const CHECK_LABEL: Record<CheckId, string> = { autokuk: 'Údaje o autě', policie: 'Kradené auto', tachometr: 'Historie tachometru' };
const PROVIDER: Record<CheckId, string> = { autokuk: 'Autokuk.cz', policie: SOURCES.policie.provider, tachometr: SOURCES.tachometr.provider };

/** Weby úřadů projdeme jen pro to, co neřekl Autokuk. Tachometr jen s VIN. */
function freeRun(id: number, done: CheckId[], vin: string | undefined, report?: UsedCarReport): Run {
  const queue = [...done];
  if (report?.stolen === undefined) queue.push('policie');
  if (!report?.mileage.length && vin) queue.push('tachometr');
  return { id, queue, index: done.length, vin };
}

type Tone = 'ok' | 'warn' | 'alert';

function stolenTone(result: Stolen | null): Tone {
  return result === 'clear' ? 'ok' : result === 'stolen' ? 'alert' : 'warn';
}

function autokukTone(answer: UsedCarAnswer | null): Tone {
  if (answer?.kind !== 'report') return 'warn';
  return answer.report.deregistered ? 'alert' : 'ok';
}

function mileageTone(result: Mileage | null): Tone {
  if (result?.kind === 'records') return result.summary.rollback ? 'alert' : 'ok';
  return result?.kind === 'not-found' ? 'ok' : 'warn';
}

function DoneIcon({ tone }: { tone: Tone }) {
  return (
    <View style={[styles.ok, { backgroundColor: tint[tone] }]}>
      <Icon name={tone === 'ok' ? 'check' : 'alert'} size={16} color={colors[tone]} strokeWidth={2.6} />
    </View>
  );
}

function OpenSite({ url, label }: { url: string; label: string }) {
  return <SecondaryButton label={label} onPress={() => Linking.openURL(url).catch(() => {})} />;
}

export default function UsedCarCheck() {
  const [spz, setSpz] = useState('');
  const [vin, setVin] = useState('');
  const [run, setRun] = useState<Run | null>(null);
  const [stolen, setStolen] = useState<Stolen | null>(null);
  const [mileage, setMileage] = useState<Mileage | null>(null);
  const [webOnly, setWebOnly] = useState(false);
  const [autokuk, setAutokuk] = useState<UsedCarAnswer | null>(null);
  // Stejné auto podruhé nechceme platit znovu.
  const lastAnswer = useRef<{ query: string; answer: UsedCarAnswer } | null>(null);
  const withApi = vehicleApiConfigured();

  const compactSpz = normalizeSpz(spz).replace(/ /g, '');
  const vinOk = isValidVin(vin);
  const spzOk = /^[0-9A-Z]{5,8}$/.test(compactSpz);
  const canStart = (vinOk || spzOk) && (!vin || vinOk);
  const current = run && run.index < run.queue.length ? run.queue[run.index] : null;
  const done = !!run && !current;

  const start = async () => {
    const id = Date.now();
    const knownVin = vinOk ? vin : undefined;
    setStolen(null);
    setWebOnly(false);
    setAutokuk(null);
    setMileage(null);
    if (!withApi) {
      if (!knownVin) setMileage({ kind: 'skipped' });
      setRun(freeRun(id, [], knownVin));
      return;
    }

    setRun({ id, queue: ['autokuk'], index: 0, vin: knownVin });
    const query = knownVin ?? compactSpz;
    const answer = lastAnswer.current?.query === query ? lastAnswer.current.answer : await fetchUsedCar(query);
    if (answer.kind !== 'failed') lastAnswer.current = { query, answer };
    const report = answer.kind === 'report' ? answer.report : undefined;
    const foundVin = knownVin ?? (report?.vin && isValidVin(report.vin) ? report.vin : undefined);
    setAutokuk(answer);
    if (report?.stolen !== undefined) setStolen(report.stolen ? 'stolen' : 'clear');
    if (report?.mileage.length) setMileage({ kind: 'records', summary: summarizeMileage(report.mileage) });
    else if (!foundVin) setMileage({ kind: 'skipped' });
    setRun(freeRun(id, ['autokuk'], foundVin, report));
  };

  const next = () => setRun((r) => (r ? { ...r, index: r.index + 1 } : r));

  const onResult = (check: CheckId, text: string): boolean => {
    if (check === 'policie') {
      setStolen(parseStolen(text));
    } else {
      const outcome = parseLookup('tachometr', text);
      if (outcome.kind === 'wrong-code') return true;
      if (outcome.kind === 'not-found') setMileage({ kind: 'not-found' });
      else {
        const records = parseMileage(text);
        setMileage(records.length ? { kind: 'records', summary: summarizeMileage(records) } : { kind: 'failed' });
      }
    }
    next();
    return false;
  };

  const onFail = (check: CheckId, reason: LookupFailure) => {
    if (reason === 'unsupported') setWebOnly(true);
    if (check === 'policie') setStolen('failed');
    else setMileage({ kind: 'failed' });
    next();
  };

  const policeSource = run?.vin ? SOURCES.policie : POLICIE_BY_SPZ;

  return (
    <Screen>
      <BackHeader title="Prověřit ojetinu" />
      <Body muted>
        {withApi
          ? 'Než auto koupíte, zjistěte, jestli ho nehledá policie, jestli mu někdo nestočil tachometr a odkud pochází.'
          : 'Než auto koupíte, zjistěte zdarma, jestli ho nehledá policie a jestli mu někdo nestočil tachometr.'}
      </Body>

      <View style={{ gap: 8 }}>
        <SectionLabel>VIN</SectionLabel>
        <VinField value={vin} onChange={setVin} />
        <Text style={styles.help}>
          {VIN_HELP} {withApi ? 'Stačí i SPZ, ale podle ní nenajdeme každé auto.' : 'Bez VIN zjistíme jen to, jestli auto nehledá policie.'}
        </Text>
      </View>

      {!vinOk && (
        <View style={{ gap: 8 }}>
          <SectionLabel>Nebo SPZ</SectionLabel>
          <View style={styles.plate}>
            <View style={styles.eu}>
              <Text style={styles.cz}>CZ</Text>
            </View>
            <TextInput
              accessibilityLabel="Registrační značka"
              value={spz}
              onChangeText={(t) => setSpz(t.toUpperCase().slice(0, 9))}
              placeholder="1AB 2345"
              placeholderTextColor="rgba(11,18,32,0.35)"
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              maxLength={9}
              style={styles.plateInput}
            />
          </View>
        </View>
      )}

      <PrimaryButton label={run && !done ? 'Prověřuji…' : done ? 'Prověřit znovu' : 'Prověřit'} icon="shield" disabled={!canStart || (!!run && !done)} onPress={start} />

      {run && (
        <GlassCard style={{ gap: 0, paddingVertical: 4 }}>
          {run.queue.map((check, i) => {
            const running = check === current;
            const finished = run.index > i;
            return (
              <View key={check} style={[styles.row, i > 0 && styles.divider]}>
                <View style={styles.status}>
                  {running ? (
                    <ActivityIndicator color={colors.accent} />
                  ) : finished ? (
                    <DoneIcon tone={check === 'autokuk' ? autokukTone(autokuk) : check === 'policie' ? stolenTone(stolen) : mileageTone(mileage)} />
                  ) : (
                    <View style={styles.todo} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{CHECK_LABEL[check]}</Text>
                  <Text style={styles.small}>{PROVIDER[check]}</Text>
                </View>
              </View>
            );
          })}
        </GlassCard>
      )}

      {current && current !== 'autokuk' && (
        <>
          <LookupRunner
            key={`${run!.id}-${current}`}
            source={current === 'policie' ? policeSource : SOURCES.tachometr}
            value={run!.vin ?? compactSpz}
            onResult={(text) => onResult(current, text)}
            onFail={(reason) => onFail(current, reason)}
          />
          <SecondaryButton label="Přeskočit" onPress={() => onFail(current, 'error')} />
        </>
      )}

      {webOnly && <Body muted>Prověření z webů policie a ministerstva běží jen v telefonu, v prohlížeči to nejde.</Body>}

      {autokuk && <VehicleCard answer={autokuk} />}
      {stolen && <StolenCard result={stolen} />}
      {mileage && <MileageCard result={mileage} />}

      <Text style={styles.footnote}>
        {withApi
          ? 'Údaje o autě poskytuje Autokuk.cz. Co tam chybí, hledáte sami ze svého telefonu na webu Policie ČR a ministerstva dopravy (kontrolatachometru.cz).'
          : 'Údaje hledáte sami ze svého telefonu na webu Policie ČR a ministerstva dopravy (kontrolatachometru.cz).'}{' '}
        Mají informativní povahu. Stav km pochází z technických a emisních kontrol a nemusí odpovídat skutečnému nájezdu.
      </Text>
    </Screen>
  );
}

function VehicleCard({ answer }: { answer: UsedCarAnswer }) {
  if (answer.kind === 'failed') return <Body muted>Autokuk.cz teď neodpověděl, proto prověřujeme zdarma na webech úřadů.</Body>;
  if (answer.kind === 'not-found') {
    return (
      <GlassCard>
        <Text style={styles.verdict}>Autokuk.cz auto nezná</Text>
        <Body muted>Prověříme ho zdarma na webech úřadů.</Body>
      </GlassCard>
    );
  }
  const r = answer.report;
  const stkExpired = !!r.stkUntil && daysUntil(r.stkUntil) < 0;
  const engine = [r.fuel, r.powerKw ? `${r.powerKw} kW` : undefined].filter(Boolean).join(', ');
  const imported = r.imported && ['Ano', r.imported.country, r.imported.date && formatCz(r.imported.date)].filter(Boolean).join(', ');
  const rows: { label: string; value: string; alert?: boolean }[] = [];
  if (r.vin) rows.push({ label: 'VIN', value: r.vin });
  if (r.firstRegistration) rows.push({ label: 'První registrace', value: formatCz(r.firstRegistration) });
  if (engine) rows.push({ label: 'Motor', value: engine });
  if (r.stkUntil) rows.push({ label: 'STK platí do', value: stkExpired ? `${formatCz(r.stkUntil)}, propadlá` : formatCz(r.stkUntil), alert: stkExpired });
  if (imported) rows.push({ label: 'Dovezené', value: imported });

  return (
    <GlassCard tone={r.deregistered ? 'alert' : undefined}>
      <Text style={styles.verdict}>{r.name ?? 'Údaje o autě'}</Text>
      {r.deregistered && (
        <Body>
          Auto bylo vyřazené z provozu{r.deregistered.date ? ` ${formatCz(r.deregistered.date)}` : ''}. Než ho koupíte, ověřte si na úřadě, že ho jde znovu
          přihlásit.
        </Body>
      )}
      {rows.map((row) => (
        <View key={row.label} style={styles.infoRow}>
          <Text style={styles.infoLabel}>{row.label}</Text>
          <Text style={[styles.infoValue, row.alert && { color: colors.alert }]}>{row.value}</Text>
        </View>
      ))}
    </GlassCard>
  );
}

function StolenCard({ result }: { result: Stolen }) {
  if (result === 'stolen') {
    return (
      <GlassCard tone="alert">
        <Text style={[styles.verdict, { color: colors.alert }]}>Policie auto hledá jako kradené</Text>
        <Body>Auto nekupujte a nic neplaťte. Oznamte to policii na 158.</Body>
        <OpenSite url={SOURCES.policie.url} label="Zobrazit na webu policie" />
      </GlassCard>
    );
  }
  if (result === 'clear') {
    return (
      <GlassCard tone="ok">
        <Text style={[styles.verdict, { color: colors.ok }]}>Policie auto nehledá</Text>
        <Body muted>V databázi odcizených vozidel k dnešnímu dni není.</Body>
      </GlassCard>
    );
  }
  return (
    <GlassCard tone="warn">
      <Text style={[styles.verdict, { color: colors.warn }]}>Kradené auto: nepodařilo se ověřit</Text>
      <Body muted>Zkuste to znovu, nebo zadejte VIN přímo na webu policie.</Body>
      <OpenSite url={SOURCES.policie.url} label="Otevřít web policie" />
    </GlassCard>
  );
}

function MileageCard({ result }: { result: Mileage }) {
  if (result.kind === 'skipped') {
    return (
      <GlassCard>
        <Text style={styles.verdict}>Tachometr</Text>
        <Body muted>Bez VIN historii tachometru nezjistíme. {VIN_HELP}</Body>
      </GlassCard>
    );
  }
  if (result.kind === 'not-found') {
    return (
      <GlassCard>
        <Text style={styles.verdict}>Tachometr: bez záznamu</Text>
        <Body muted>Kontrola tachometru auto nezná. Nové nebo nedávno dovezené auto tam být nemusí.</Body>
      </GlassCard>
    );
  }
  if (result.kind === 'failed') {
    return (
      <GlassCard tone="warn">
        <Text style={[styles.verdict, { color: colors.warn }]}>Tachometr: nepodařilo se načíst</Text>
        <Body muted>Zkuste to znovu, nebo zadejte VIN přímo na webu kontroly tachometru.</Body>
        <OpenSite url={SOURCES.tachometr.url} label="Otevřít kontrolu tachometru" />
      </GlassCard>
    );
  }
  const { summary } = result;
  const { rollback, perYear, last } = summary;
  return (
    <GlassCard tone={rollback ? 'alert' : 'ok'}>
      <Text style={[styles.verdict, { color: rollback ? colors.alert : colors.ok }]}>{rollback ? 'Tachometr šel dozadu' : 'Tachometr nešel dozadu'}</Text>
      {rollback ? (
        <Body>
          {formatCz(rollback.from.date)} ukazoval {fmtKm(rollback.from.km)}, {formatCz(rollback.to.date)} už jen {fmtKm(rollback.to.km)}. Chtějte po prodejci
          vysvětlení a doklad o výměně tachometru, jinak auto raději nekupujte.
        </Body>
      ) : (
        <Body muted>Při žádné z {summary.records.length} prohlídek nebylo km méně než při té předchozí.</Body>
      )}
      <MileageChart summary={summary} />
      {last && (
        <Text style={styles.small}>
          Poslední prohlídka {formatCz(last.date)}: {fmtKm(last.km)}
          {perYear ? `. Ročně najezdí asi ${fmtKm(perYear)}.` : '.'}
        </Text>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  help: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted },
  plate: {
    flexDirection: 'row',
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.plate,
    borderWidth: 3,
    borderColor: colors.plateText,
  },
  eu: { width: 30, backgroundColor: colors.plateEu, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 6 },
  cz: { fontFamily: fonts.bodyHeavy, fontSize: 12, color: '#FFFFFF' },
  plateInput: { flex: 1, paddingHorizontal: 14, fontFamily: fonts.bodyHeavy, fontSize: 28, letterSpacing: 4, color: colors.plateText },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingVertical: 8 },
  divider: { borderTopWidth: 1, borderTopColor: 'rgba(140,170,220,0.12)' },
  status: { width: 28, alignItems: 'center' },
  ok: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  todo: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(140,170,220,0.5)' },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.text },
  small: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.muted },
  verdict: { fontFamily: fonts.display, fontSize: 17, color: colors.text },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  infoLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
  infoValue: { flexShrink: 1, fontFamily: fonts.bodyBold, fontSize: 13, color: colors.text, textAlign: 'right' },
  footnote: { fontFamily: fonts.body, fontSize: 11, lineHeight: 16, color: colors.faint, textAlign: 'center' },
});
