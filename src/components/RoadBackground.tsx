import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';

import { colors } from '@/theme';

const CELL = 46;
const DASH = 80;

/** Animované 3D pozadí: mřížka silnice ubíhající k obzoru. */
export function RoadBackground() {
  const { width, height } = useWindowDimensions();
  const [grid] = useState(() => new Animated.Value(0));
  const [lane] = useState(() => new Animated.Value(0));
  const gridShift = useMemo(() => grid.interpolate({ inputRange: [0, 1], outputRange: [0, CELL] }), [grid]);
  const laneShift = useMemo(() => lane.interpolate({ inputRange: [0, 1], outputRange: [0, DASH] }), [lane]);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const loop = (value: Animated.Value, duration: number) =>
      Animated.loop(Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
    const a = loop(grid, 2200);
    const b = loop(lane, 1100);
    a.start();
    b.start();
    return () => {
      a.stop();
      b.stop();
    };
  }, [grid, lane, reduceMotion]);

  const floorWidth = width * 3.4;
  const floorHeight = height * 0.95;
  const columns = Math.ceil(floorWidth / CELL) + 1;
  const rows = Math.ceil(floorHeight / CELL) + 2;
  const dashes = Math.ceil(floorHeight / DASH) + 2;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={[colors.groundDeep, colors.ground, '#0E2C4D']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.floor,
          {
            top: height * 0.56,
            left: (width - floorWidth) / 2,
            width: floorWidth,
            height: floorHeight,
            transform: [{ perspective: 240 }, { rotateX: '66deg' }],
          },
        ]}
      >
        {Array.from({ length: columns }, (_, i) => (
          <View key={`c${i}`} style={[styles.column, { left: i * CELL }]} />
        ))}
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            top: -CELL,
            transform: [{ translateY: gridShift }],
          }}
        >
          {Array.from({ length: rows }, (_, i) => (
            <View key={`r${i}`} style={[styles.row, { top: i * CELL }]} />
          ))}
        </Animated.View>
        <Animated.View
          style={{
            position: 'absolute',
            left: floorWidth / 2 - 4,
            top: -DASH,
            width: 8,
            height: floorHeight + DASH * 2,
            transform: [{ translateY: laneShift }],
          }}
        >
          {Array.from({ length: dashes }, (_, i) => (
            <View key={`d${i}`} style={[styles.dash, { top: i * DASH }]} />
          ))}
        </Animated.View>
      </View>
      {/* Mlha u obzoru, aby mřížka plynule mizela. */}
      <LinearGradient
        colors={[colors.ground, 'rgba(7,11,20,0)']}
        style={{ position: 'absolute', left: 0, right: 0, top: height * 0.5, height: height * 0.18 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  floor: { position: 'absolute', overflow: 'hidden', transformOrigin: 'top' },
  column: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(56,225,255,0.18)' },
  row: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(56,225,255,0.28)' },
  dash: { position: 'absolute', left: 0, width: 8, height: 34, borderRadius: 2, backgroundColor: 'rgba(255,181,71,0.85)' },
});
