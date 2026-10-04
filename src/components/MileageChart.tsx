import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { parseIsoDate } from '@/lib/dates';
import { fmtKm, type MileageSummary } from '@/lib/usedCar';
import { colors, fonts } from '@/theme';

const HEIGHT = 150;
const PAD = 10;

/** Stav tachometru při každé prohlídce. Úsek, kde km klesly, je červeně. */
export function MileageChart({ summary }: { summary: MileageSummary }) {
  const [width, setWidth] = useState(0);
  const { records, rollback } = summary;
  const times = records.map((r) => parseIsoDate(r.date).getTime());
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const maxKm = Math.max(...records.map((r) => r.km), 1);
  const x = (t: number) => PAD + (maxT === minT ? (width - 2 * PAD) / 2 : ((t - minT) / (maxT - minT)) * (width - 2 * PAD));
  const y = (km: number) => PAD + (1 - km / maxKm) * (HEIGHT - 2 * PAD);
  const points = records.map((r, i) => ({ x: x(times[i]), y: y(r.km), r }));
  const bad = rollback ? [rollback.from, rollback.to] : [];

  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.axis}>{fmtKm(maxKm)}</Text>
      <View style={{ height: HEIGHT }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            <Line x1={PAD} y1={HEIGHT - PAD} x2={width - PAD} y2={HEIGHT - PAD} stroke="rgba(140,170,220,0.25)" strokeWidth={1} />
            <Polyline points={points.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={colors.accent} strokeWidth={2.5} strokeLinejoin="round" />
            {rollback && (
              <Line
                x1={x(parseIsoDate(rollback.from.date).getTime())}
                y1={y(rollback.from.km)}
                x2={x(parseIsoDate(rollback.to.date).getTime())}
                y2={y(rollback.to.km)}
                stroke={colors.alert}
                strokeWidth={3.5}
              />
            )}
            {points.map((p) => (
              <Circle key={`${p.r.date}-${p.r.km}`} cx={p.x} cy={p.y} r={4.5} fill={bad.includes(p.r) ? colors.alert : colors.accent} stroke={colors.surfaceSolid} strokeWidth={2} />
            ))}
          </Svg>
        )}
      </View>
      <View style={styles.years}>
        <Text style={styles.axis}>{records[0] ? parseIsoDate(records[0].date).getFullYear() : ''}</Text>
        <Text style={styles.axis}>{records.length > 1 ? parseIsoDate(records.at(-1)!.date).getFullYear() : ''}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  axis: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.faint },
  years: { flexDirection: 'row', justifyContent: 'space-between' },
});
