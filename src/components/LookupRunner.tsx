import { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TextInput, View } from 'react-native';

import { HiddenLookup, type HiddenLookupHandle } from '@/lib/lookup/HiddenLookup';
import type { LookupEvent, LookupSource } from '@/lib/lookup/sources';
import { colors, fonts } from '@/theme';
import { Body, GlassCard, IconButton, PrimaryButton } from './ui';

type Phase = 'running' | 'captcha-image' | 'captcha-widget' | 'checking';

/** Na odpověď webu čekáme nejdéle tak dlouho, pak to vzdáme. Na člověka s kódem čekáme bez limitu. */
const TIMEOUT_MS = 25000;

export type LookupFailure = 'unsupported' | 'error' | 'timeout';

/**
 * Jedno vyhledání na oficiálním webu v telefonu klienta, včetně kódu z obrázku nebo „Nejsem robot“.
 * onResult vrátí true, když web hlásí špatný kód. Pak stránku načteme znovu s novým kódem.
 */
export function LookupRunner({
  source,
  value,
  onResult,
  onFail,
}: {
  source: LookupSource;
  value: string;
  onResult: (text: string) => boolean;
  onFail: (reason: LookupFailure) => void;
}) {
  const lookup = useRef<HiddenLookupHandle>(null);
  const [phase, setPhase] = useState<Phase>('running');
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const failRef = useRef(onFail);
  useEffect(() => {
    failRef.current = onFail;
  }, [onFail]);

  useEffect(() => {
    if (phase !== 'running' && phase !== 'checking') return;
    const t = setTimeout(() => failRef.current('timeout'), TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [phase, round]);

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
        if (onResult(e.text)) {
          setNote('Kód nesouhlasil, tady je nový.');
          setCode('');
          setPhase('running');
          setRound((r) => r + 1);
          lookup.current?.reload();
        }
        break;
      case 'unsupported':
        onFail('unsupported');
        break;
      case 'error':
        onFail('error');
        break;
    }
  };

  return (
    <View style={{ gap: 12 }}>
      {note && <Body muted>{note}</Body>}
      {phase === 'captcha-image' && captcha && (
        <GlassCard tone="accent">
          <Text style={styles.title}>Opište kód z obrázku</Text>
          <Body muted>Tuhle kontrolu vyžaduje {source.provider}. Zabere pár vteřin.</Body>
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
      {phase === 'captcha-widget' && (
        <View style={{ gap: 8 }}>
          <Text style={styles.title}>Potvrďte kontrolu {source.provider}</Text>
          <Body muted>Tuhle kontrolu nejde zobrazit jinak, ukazujeme ji tak, jak ji poslal web.</Body>
        </View>
      )}
      <HiddenLookup ref={lookup} source={source} value={value} showWidget={phase === 'captcha-widget'} onEvent={onEvent} />
      {phase === 'captcha-widget' && (
        <PrimaryButton
          label="Hotovo, pokračovat"
          onPress={() => {
            lookup.current?.submit('');
            setPhase('checking');
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.text },
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
});
