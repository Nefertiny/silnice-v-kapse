import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { BackHeader, Body, ChoiceGroup, GlassCard, PrimaryButton, SecondaryButton, SectionLabel, Stepper } from '@/components/ui';
import { arriveByLabel } from '@/lib/commute';
import { useCommute } from '@/lib/commuteStore';
import { notificationsSupported } from '@/lib/reminders';
import { drive, findPlace, routeErrorText, routingConfigured } from '@/lib/route/mapy';
import { colors, fonts } from '@/theme';

const STEP_MIN = 15;

export default function CommuteSetup() {
  const { commute, setCommute } = useCommute();
  const [home, setHome] = useState(commute?.home.query ?? '');
  const [work, setWork] = useState(commute?.work.query ?? '');
  const [arriveBy, setArriveBy] = useState(commute?.arriveBy ?? 8 * 60);
  const [remind, setRemind] = useState<'ano' | 'ne'>(commute?.remind === false ? 'ne' : 'ano');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changeArrive = (by: number) => setArriveBy((m) => Math.min(23 * 60 + 45, Math.max(0, m + by)));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const [h, w] = await Promise.all([findPlace(home), findPlace(work)]);
      // Doba jízdy po volných silnicích, podle ní pak poznáme, o kolik je dnes hůř.
      const [there, back] = await Promise.all([drive(h.position, w.position), drive(w.position, h.position)]);
      setCommute({ home: h, work: w, arriveBy, remind: remind === 'ano', usualToWork: there.minutes, usualToHome: back.minutes });
      router.back();
    } catch (e) {
      setError(routeErrorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <BackHeader title="Cesta do práce" />
      <Body muted>Každé ráno vám řekneme, kolik dnes pojedete a kdy nejpozději vyrazit. Odpoledne ukážeme cestu domů.</Body>

      <GlassCard style={{ gap: 0, paddingVertical: 4 }}>
        <View style={styles.place}>
          <View style={[styles.dot, { borderWidth: 2, borderColor: colors.accent }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>DOMOV</Text>
            <TextInput accessibilityLabel="Domov" value={home} onChangeText={setHome} style={styles.input} placeholder="Ulice a město" placeholderTextColor={colors.faint} />
            {commute && home === commute.home.query ? <Text style={styles.found}>{commute.home.label}</Text> : null}
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.place}>
          <View style={[styles.dot, { backgroundColor: colors.warn }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>PRÁCE</Text>
            <TextInput accessibilityLabel="Práce" value={work} onChangeText={setWork} style={styles.input} placeholder="Ulice a město" placeholderTextColor={colors.faint} />
            {commute && work === commute.work.query ? <Text style={styles.found}>{commute.work.label}</Text> : null}
          </View>
        </View>
      </GlassCard>

      <GlassCard style={styles.row}>
        <SectionLabel>V práci chci být v</SectionLabel>
        <Stepper value={arriveByLabel(arriveBy)} label="čas příjezdu" onMinus={() => changeArrive(-STEP_MIN)} onPlus={() => changeArrive(STEP_MIN)} />
      </GlassCard>

      <SectionLabel>Ranní upozornění ve všední dny</SectionLabel>
      <ChoiceGroup
        options={[
          { value: 'ano', label: 'Upozornit' },
          { value: 'ne', label: 'Neupozorňovat' },
        ]}
        value={remind}
        onChange={setRemind}
      />
      {!notificationsSupported && <Body muted>V Expo Go na Androidu upozornění nefungují, v hotové appce ano.</Body>}

      {!routingConfigured() && <Body muted>Mapa a provoz zatím nejsou zapnuté, cestu teď uložit nejde.</Body>}
      {error && <Text style={styles.error}>{error}</Text>}

      <PrimaryButton
        label={saving ? 'Hledám adresy…' : 'Uložit'}
        disabled={saving || home.trim().length < 2 || work.trim().length < 2 || !routingConfigured()}
        onPress={save}
      />
      {commute && (
        <SecondaryButton
          label="Smazat cestu do práce"
          onPress={() => {
            setCommute(null);
            router.back();
          }}
        />
      )}
      <Text style={styles.note}>Adresy zůstávají jen ve vašem telefonu. Trasu a provoz počítá Mapy.com.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  place: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.muted },
  input: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.text, paddingVertical: 2 },
  found: { fontFamily: fonts.body, fontSize: 12, color: colors.faint },
  divider: { height: 1, backgroundColor: 'rgba(140,170,220,0.14)', marginLeft: 22 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  error: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.alert },
  note: { fontFamily: fonts.body, fontSize: 12, color: colors.faint, textAlign: 'center' },
});
