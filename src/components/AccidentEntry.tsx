import { router } from 'expo-router';

import { formatWhen } from '@/lib/accident';
import { useAccident } from '@/lib/accidentStore';
import { StatusRow } from './ui';

/** Vstup do průvodce nehodou. Rozpracovanou nehodu nabídne k dokončení. */
export function AccidentEntry() {
  const { ready, accident, start } = useAccident();
  if (!ready) return null;
  if (accident) {
    return (
      <StatusRow
        icon="alert"
        title="Rozpracovaná nehoda"
        subtitle={formatWhen(accident.startedAt)}
        tone="warn"
        pill={{ label: 'Pokračovat', tone: 'warn' }}
        onPress={() => router.push('/nehoda')}
      />
    );
  }
  return (
    <StatusRow
      icon="alert"
      title="Měli jste nehodu?"
      subtitle="Provedeme vás krok za krokem až po podklad pro pojišťovnu"
      tone="alert"
      onPress={() => {
        start();
        router.push('/nehoda');
      }}
    />
  );
}
