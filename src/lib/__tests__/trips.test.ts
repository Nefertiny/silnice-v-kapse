import { bestSlot, departureSlots, fmtDuration, fmtTime, worstSlot } from '../trips';

describe('trips', () => {
  it('formats times and durations', () => {
    expect(fmtTime(6 * 60 + 40)).toBe('6:40');
    expect(fmtDuration(112)).toBe('1 h 52 min');
    expect(fmtDuration(45)).toBe('45 min');
  });

  it('prefers an early Saturday start over the late-morning peak', () => {
    const slots = departureSlots('sobota', 112, new Date(2026, 9, 4, 1, 0));
    expect(slots).toHaveLength(9);
    expect(slots[0].label).toBe('6:00');
    expect(bestSlot(slots).minutes).toBeLessThan(worstSlot(slots).minutes);
    expect(worstSlot(slots).travel).toBeGreaterThan(bestSlot(slots).travel);
  });
});
