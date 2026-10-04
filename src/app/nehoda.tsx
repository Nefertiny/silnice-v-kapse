import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { Icon, type IconName } from '@/components/Icon';
import { Screen } from '@/components/Screen';
import { BackHeader, Body, ChoiceGroup, GlassCard, PrimaryButton, SecondaryButton, SectionLabel, StatusRow } from '@/components/ui';
import {
  PHOTO_SHOTS,
  POLICE_QUESTIONS,
  SAFETY_STEPS,
  claimAdvice,
  formatWhen,
  missingItems,
  photosOf,
  policeVerdict,
  type Accident,
  type Fault,
  type PhotoKind,
} from '@/lib/accident';
import { deletePhotos } from '@/lib/accidentFiles';
import { takePhoto } from '@/lib/accidentPhotos';
import { locateHere, placeErrorText } from '@/lib/accidentPlace';
import { shareAccidentReport, sharePhoto } from '@/lib/accidentReport';
import { useAccident } from '@/lib/accidentStore';
import { useCars } from '@/lib/cars';
import { INSURERS, OTHER_INSURER } from '@/lib/insurers';
import { colors, fonts, tint } from '@/theme';

const STEPS = [
  { title: 'Bezpečnost', icon: 'alert' },
  { title: 'Volat policii?', icon: 'shield' },
  { title: 'Místo a čas', icon: 'pin' },
  { title: 'Fotky', icon: 'camera' },
  { title: 'Druhý řidič', icon: 'car' },
  { title: 'Co se stalo', icon: 'doc' },
  { title: 'Hotovo', icon: 'check' },
] as const satisfies readonly { title: string; icon: IconName }[];

const SUMMARY = STEPS.length - 1;

const INSURER_OPTIONS = [...INSURERS, OTHER_INSURER, 'Nevím'].map((name) => ({ value: name, label: name }));

function call(number: string) {
  Linking.openURL(`tel:${number}`).catch(() => {});
}

function CallButton({ number, label, strong }: { number: string; label: string; strong?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, volat ${number}`}
      onPress={() => call(number)}
      style={({ pressed }) => [styles.call, strong && styles.callStrong, pressed && { opacity: 0.8 }]}
    >
      <Icon name="phone" size={20} color={strong ? colors.onAccent : colors.alert} strokeWidth={2} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.callLabel, strong && { color: colors.onAccent }]}>{label}</Text>
      </View>
      <Text style={[styles.callNumber, strong && { color: colors.onAccent }]}>{number}</Text>
    </Pressable>
  );
}

function CheckRow({ text, done, onPress }: { text: string; done: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      onPress={onPress}
      style={({ pressed }) => [styles.check, done && { borderColor: 'rgba(61,220,151,0.45)' }, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.checkBox, done && { backgroundColor: colors.ok, borderColor: colors.ok }]}>
        {done && <Icon name="check" size={16} color={colors.onAccent} strokeWidth={3} />}
      </View>
      <Text style={[styles.checkText, done && { color: colors.muted }]}>{text}</Text>
    </Pressable>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  multiline,
  caps,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  caps?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        keyboardType={keyboardType}
        autoCapitalize={caps ? 'characters' : 'sentences'}
        multiline={multiline}
        style={[styles.input, multiline && { minHeight: 96, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

function PhotoTile({
  title,
  hint,
  uris,
  busy,
  onAdd,
  onRemove,
}: {
  title: string;
  hint: string;
  uris: { id: string; uri: string }[];
  busy: boolean;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const done = uris.length > 0;
  return (
    <View style={[styles.tile, done && { borderColor: 'rgba(61,220,151,0.45)' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.tileTitle}>{title}</Text>
          <Text style={styles.small}>{hint}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Vyfotit: ${title}`}
          disabled={busy}
          onPress={onAdd}
          style={({ pressed }) => [styles.shoot, (pressed || busy) && { opacity: 0.7 }]}
        >
          <Icon name={done ? 'plus' : 'camera'} size={20} color={colors.onAccent} strokeWidth={2} />
        </Pressable>
      </View>
      {done && (
        <View style={styles.thumbs}>
          {uris.map((p) => (
            <View key={p.id}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Poslat fotku: ${title}`} onPress={() => sharePhoto(p.uri).catch(() => {})}>
                <Image source={{ uri: p.uri }} style={styles.thumb} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Smazat fotku: ${title}`} onPress={() => onRemove(p.id)} hitSlop={8} style={styles.remove}>
                <Icon name="close" size={12} color={colors.text} strokeWidth={2.6} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function AccidentScreen() {
  const { ready, accident, start, update, discard } = useAccident();
  const { cars } = useCars();
  // Rozpracovanou nehodu otevřeme na přehledu, novou od prvního kroku.
  const [step, setStep] = useState(() => (accident && (accident.photos.length || accident.other.name || accident.place) ? SUMMARY : 0));
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!ready) return <Screen>{null}</Screen>;

  if (!accident) {
    return (
      <Screen>
        <BackHeader title="Nehoda" />
        <Body muted>Provedeme vás vším, co je po nehodě potřeba: bezpečnost, policie, fotky, údaje druhého řidiče a podklad pro pojišťovnu.</Body>
        <PrimaryButton label="Začít" icon="alert" onPress={() => start()} />
      </Screen>
    );
  }

  const myCar = cars.find((c) => c.id === accident.myCarId) ?? cars[0];
  const verdict = policeVerdict(accident);
  const set = (change: (a: Accident) => Accident) => update(change);
  const setOther = (key: keyof Accident['other'], value: string) => set((a) => ({ ...a, other: { ...a.other, [key]: value } }));
  const setWitness = (key: keyof Accident['witness'], value: string) => set((a) => ({ ...a, witness: { ...a.witness, [key]: value } }));
  const go = (to: number) => {
    setMessage(null);
    setStep(Math.max(0, Math.min(SUMMARY, to)));
  };

  const addPhoto = async (kind: PhotoKind) => {
    setBusy(kind);
    setMessage(null);
    try {
      const uri = await takePhoto();
      if (uri) set((a) => ({ ...a, photos: [...a.photos, { id: `${Date.now()}-${a.photos.length}`, kind, uri }] }));
    } catch {
      setMessage('Fotku se nepodařilo uložit. Zkuste to znovu.');
    } finally {
      setBusy(null);
    }
  };

  const removePhoto = (id: string) => {
    const photo = accident.photos.find((p) => p.id === id);
    if (photo) deletePhotos([photo.uri]);
    set((a) => ({ ...a, photos: a.photos.filter((p) => p.id !== id) }));
  };

  const findPlace = async () => {
    setBusy('place');
    setMessage(null);
    try {
      const place = await locateHere();
      set((a) => ({ ...a, place }));
    } catch (e) {
      setMessage(placeErrorText(e));
    } finally {
      setBusy(null);
    }
  };

  const makeReport = async () => {
    setBusy('pdf');
    setMessage(null);
    try {
      await shareAccidentReport(accident, myCar ? { spz: myCar.spz, name: myCar.name, insurer: myCar.insurer } : undefined);
    } catch {
      setMessage('PDF se nepodařilo vytvořit. Zkuste to znovu.');
    } finally {
      setBusy(null);
    }
  };

  const footer =
    step < SUMMARY ? (
      <View style={styles.nav}>
        {step > 0 && <SecondaryButton style={{ flex: 1 }} label="Zpět" onPress={() => go(step - 1)} />}
        <PrimaryButton style={{ flex: 2 }} label={step === SUMMARY - 1 ? 'Shrnutí' : 'Další krok'} onPress={() => go(step + 1)} />
      </View>
    ) : undefined;

  return (
    <Screen key={step} footer={footer}>
      <BackHeader title="Nehoda" subtitle={`Krok ${step + 1} ze ${STEPS.length} · ${STEPS[step].title}`} />
      <View style={styles.progress}>
        {STEPS.map((s, i) => (
          <Pressable key={s.title} accessibilityRole="button" accessibilityLabel={`Krok ${i + 1}: ${s.title}`} onPress={() => go(i)} style={styles.progressHit}>
            <View style={[styles.progressBar, i <= step && { backgroundColor: colors.accent }]} />
          </Pressable>
        ))}
      </View>

      {step === 0 && (
        <>
          <Body>Zachovejte klid. Nejdřív zajistěte sebe a ostatní, teprve potom řešte auta.</Body>
          <View style={{ gap: 8 }}>
            {SAFETY_STEPS.map((s) => {
              const done = accident.safety.includes(s.id);
              return (
                <CheckRow
                  key={s.id}
                  text={s.text}
                  done={done}
                  onPress={() => set((a) => ({ ...a, safety: done ? a.safety.filter((id) => id !== s.id) : [...a.safety, s.id] }))}
                />
              );
            })}
          </View>
          <SectionLabel>Tísňové linky</SectionLabel>
          <CallButton number="155" label="Záchranka" strong />
          <CallButton number="158" label="Policie" />
          <CallButton number="112" label="Tísňová linka, i v cizině" />
        </>
      )}

      {step === 1 && (
        <>
          <Body muted>Policii musíte volat, když platí aspoň jedna z věcí níže. Jinak stačí, když spolu s druhým řidičem sepíšete záznam o nehodě.</Body>
          {POLICE_QUESTIONS.map((q) => {
            const answer = accident.police[q.id];
            return (
              <GlassCard key={q.id} style={{ gap: 10 }} tone={answer ? 'alert' : undefined}>
                <Text style={styles.question}>{q.text}</Text>
                <ChoiceGroup
                  options={[
                    { value: 'ano', label: 'Ano' },
                    { value: 'ne', label: 'Ne' },
                  ]}
                  value={answer === undefined ? '' : answer ? 'ano' : 'ne'}
                  onChange={(v) => set((a) => ({ ...a, police: { ...a.police, [q.id]: v === 'ano' } }))}
                />
              </GlassCard>
            );
          })}
          {verdict === 'call' && (
            <GlassCard tone="alert">
              <Text style={[styles.verdict, { color: colors.alert }]}>Volejte policii.</Text>
              <Body>Do jejího příjezdu s auty nehýbejte. Když blokují provoz, nejdřív vyfoťte, kde stojí, a pak je odsuňte.</Body>
              <CallButton number="158" label="Policie" strong />
            </GlassCard>
          )}
          {verdict === 'not-needed' && (
            <GlassCard tone="ok">
              <Text style={[styles.verdict, { color: colors.ok }]}>Policii volat nemusíte.</Text>
              <Body>Vyfoťte nehodu, sepište s druhým řidičem záznam o dopravní nehodě a oba ho podepište.</Body>
            </GlassCard>
          )}
        </>
      )}

      {step === 2 && (
        <>
          <GlassCard>
            <SectionLabel>Kdy</SectionLabel>
            <Text style={styles.big}>{formatWhen(accident.startedAt)}</Text>
            <SectionLabel>Kde</SectionLabel>
            {accident.place ? (
              <>
                {accident.place.address ? <Text style={styles.big}>{accident.place.address}</Text> : null}
                <Text style={styles.small}>
                  GPS {accident.place.lat.toFixed(5)}, {accident.place.lon.toFixed(5)}
                </Text>
              </>
            ) : (
              <Text style={styles.small}>Poloha zatím není.</Text>
            )}
            <SecondaryButton icon="pin" label={busy === 'place' ? 'Zjišťuji polohu…' : accident.place ? 'Zjistit znovu' : 'Zjistit polohu'} disabled={busy === 'place'} onPress={findPlace} />
          </GlassCard>
          <Field
            label="Upřesnění místa"
            value={accident.placeNote}
            onChange={(v) => set((a) => ({ ...a, placeNote: v }))}
            placeholder="Např. D1 km 34 směr Brno, křižovatka u pošty"
          />
        </>
      )}

      {step === 3 && (
        <>
          <Body muted>Fotky jsou nejlepší důkaz. Nejdřív celkový pohled z dálky, ať je vidět, kde auta stojí, potom škody a doklady.</Body>
          {PHOTO_SHOTS.map((shot) => (
            <PhotoTile
              key={shot.kind}
              title={shot.title}
              hint={shot.hint}
              uris={photosOf(accident, shot.kind)}
              busy={busy === shot.kind}
              onAdd={() => addPhoto(shot.kind)}
              onRemove={removePhoto}
            />
          ))}
          <PhotoTile
            title="Další fotky"
            hint="Brzdné stopy, značky, svědci, třeba i záznam o nehodě"
            uris={photosOf(accident, 'extra')}
            busy={busy === 'extra'}
            onAdd={() => addPhoto('extra')}
            onRemove={removePhoto}
          />
          {Platform.OS !== 'web' && <Text style={styles.note}>Klepnutím na fotku ji pošlete dál. Fotky zůstávají jen v appce.</Text>}
        </>
      )}

      {step === 4 && (
        <>
          <Body muted>Doklady máte vyfocené. Sem opište hlavně telefon a pojišťovnu, ať je máte po ruce.</Body>
          <Field label="Jméno a příjmení" value={accident.other.name} onChange={(v) => setOther('name', v)} />
          <Field label="Telefon" value={accident.other.phone} onChange={(v) => setOther('phone', v)} keyboardType="phone-pad" />
          <Field label="SPZ druhého auta" value={accident.other.spz} onChange={(v) => setOther('spz', v.toUpperCase())} caps />
          <SectionLabel>Pojišťovna druhého auta</SectionLabel>
          <Text style={styles.small}>Najdete ji na zelené kartě.</Text>
          <ChoiceGroup options={INSURER_OPTIONS} value={accident.other.insurer} onChange={(v) => setOther('insurer', v)} />
          <Field label="Číslo pojistky nebo zelené karty" value={accident.other.policy} onChange={(v) => setOther('policy', v)} placeholder="Nepovinné" />
          {cars.length > 1 && (
            <>
              <SectionLabel>Moje auto</SectionLabel>
              <ChoiceGroup columns={3} options={cars.map((c) => ({ value: c.id, label: c.spz }))} value={myCar?.id ?? ''} onChange={(id) => set((a) => ({ ...a, myCarId: id }))} />
            </>
          )}
          <SectionLabel>Svědek (nepovinné)</SectionLabel>
          <Field label="Jméno svědka" value={accident.witness.name} onChange={(v) => setWitness('name', v)} />
          <Field label="Telefon svědka" value={accident.witness.phone} onChange={(v) => setWitness('phone', v)} keyboardType="phone-pad" />
        </>
      )}

      {step === 5 && (
        <>
          <Field
            label="Co se stalo"
            value={accident.description}
            onChange={(v) => set((a) => ({ ...a, description: v }))}
            placeholder="Např. Stál jsem na červenou, druhé auto do mě narazilo zezadu."
            multiline
          />
          <SectionLabel>Kdo nehodu zavinil?</SectionLabel>
          <ChoiceGroup<Fault | ''>
            options={[
              { value: 'me', label: 'Já' },
              { value: 'other', label: 'Druhý řidič' },
              { value: 'unclear', label: 'Neshodneme se' },
            ]}
            value={accident.fault ?? ''}
            onChange={(v) => set((a) => ({ ...a, fault: v || undefined }))}
          />
          {accident.fault && (
            <GlassCard tone={accident.fault === 'unclear' ? 'alert' : 'accent'}>
              <Body>{claimAdvice(accident.fault, accident.other.insurer === 'Nevím' ? '' : accident.other.insurer, myCar?.insurer)}</Body>
              {accident.fault === 'unclear' && <CallButton number="158" label="Policie" strong />}
            </GlassCard>
          )}
          <Text style={styles.note}>V papírovém záznamu o nehodě podepisujte jen to, s čím souhlasíte.</Text>
        </>
      )}

      {step === SUMMARY && <Summary accident={accident} go={go} />}

      {step === SUMMARY && (
        <>
          <PrimaryButton icon="doc" label={busy === 'pdf' ? 'Připravuji PDF…' : 'Vytvořit PDF a poslat'} disabled={busy === 'pdf'} onPress={makeReport} />
          <Text style={styles.note}>PDF je podklad pro pojišťovnu. Papírový záznam o nehodě podepsaný oběma řidiči nenahrazuje.</Text>
          {confirmDelete ? (
            <GlassCard tone="alert">
              <Body>Smazat nehodu? Smažou se i fotky v appce.</Body>
              <View style={styles.nav}>
                <SecondaryButton style={{ flex: 1 }} label="Nechat" onPress={() => setConfirmDelete(false)} />
                <PrimaryButton
                  style={{ flex: 1, backgroundColor: colors.alert }}
                  label="Smazat"
                  onPress={() => {
                    discard();
                    router.back();
                  }}
                />
              </View>
            </GlassCard>
          ) : (
            <SecondaryButton icon="trash" label="Smazat nehodu" onPress={() => setConfirmDelete(true)} />
          )}
        </>
      )}

      {message && <Text style={styles.error}>{message}</Text>}
    </Screen>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function Summary({ accident, go }: { accident: Accident; go: (step: number) => void }) {
  const missing = missingItems(accident);
  const verdict = policeVerdict(accident);
  const photos = accident.photos.length;
  const rows: { step: number; subtitle: string; ok: boolean }[] = [
    { step: 0, subtitle: `${accident.safety.length} z ${SAFETY_STEPS.length} hotovo`, ok: accident.safety.length === SAFETY_STEPS.length },
    {
      step: 1,
      subtitle: verdict === 'call' ? 'Je nutné volat policii' : verdict === 'not-needed' ? 'Policii volat nemusíte' : 'Odpovězte na otázky',
      ok: verdict === 'not-needed',
    },
    { step: 2, subtitle: accident.place?.address ?? (accident.place ? 'Poloha uložená' : accident.placeNote || 'Chybí místo'), ok: !!accident.place || !!accident.placeNote.trim() },
    { step: 3, subtitle: photos ? `${photos} ${photos === 1 ? 'fotka' : photos < 5 ? 'fotky' : 'fotek'}` : 'Zatím žádná fotka', ok: PHOTO_SHOTS.every((s) => photosOf(accident, s.kind).length) },
    {
      step: 4,
      subtitle: [accident.other.name, accident.other.spz, accident.other.insurer].filter(Boolean).join(' · ') || 'Chybí údaje',
      ok: !!(accident.other.name && accident.other.phone && accident.other.spz && accident.other.insurer),
    },
    { step: 5, subtitle: accident.fault ? (accident.fault === 'me' ? 'Zavinil jsem já' : accident.fault === 'other' ? 'Zavinil druhý řidič' : 'Neshodnete se') : 'Chybí, kdo zavinil', ok: !!accident.fault && accident.fault !== 'unclear' },
  ];
  return (
    <>
      <GlassCard tone={missing.length ? 'warn' : 'ok'}>
        <Text style={[styles.verdict, { color: missing.length ? colors.warn : colors.ok }]}>{missing.length ? 'Ještě chybí' : 'Máte všechno'}</Text>
        <Body muted>
          {missing.length
            ? `${capitalize(missing.join(', '))}. Doplňte to, dokud je druhý řidič na místě.`
            : 'Vytvořte PDF a pošlete ho pojišťovně. Papírový záznam o nehodě si nechte.'}
        </Body>
      </GlassCard>
      <View style={{ gap: 10 }}>
        {rows.map((r) => (
          <StatusRow
            key={r.step}
            icon={STEPS[r.step].icon}
            title={STEPS[r.step].title}
            subtitle={r.subtitle}
            tone={r.ok ? 'ok' : r.step === 1 && verdict === 'call' ? 'alert' : 'warn'}
            pill={{ label: 'Upravit', tone: 'neutral' }}
            onPress={() => go(r.step)}
          />
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  progress: { flexDirection: 'row', gap: 4 },
  progressHit: { flex: 1, paddingVertical: 6 },
  progressBar: { height: 4, borderRadius: 2, backgroundColor: 'rgba(140,170,220,0.2)' },
  nav: { flexDirection: 'row', gap: 10 },
  call: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,107,129,0.45)',
    backgroundColor: tint.alert,
  },
  callStrong: { backgroundColor: colors.alert, borderColor: colors.alert },
  callLabel: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  callNumber: { fontFamily: fonts.display, fontSize: 20, color: colors.alert },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  checkBox: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkText: { flex: 1, fontFamily: fonts.bodySemi, fontSize: 15, lineHeight: 20, color: colors.text },
  question: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 21, color: colors.text },
  verdict: { fontFamily: fonts.display, fontSize: 18 },
  big: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.text },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted },
  note: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: colors.faint, textAlign: 'center' },
  error: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.alert },
  field: { gap: 6 },
  fieldLabel: { fontFamily: fonts.bodyBold, fontSize: 12, letterSpacing: 1, color: colors.muted, textTransform: 'uppercase' },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(140,170,220,0.22)',
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.text,
  },
  tile: { borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 14, gap: 12 },
  tileTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text },
  shoot: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 76, height: 76, borderRadius: 10, backgroundColor: colors.surfaceSolid },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
