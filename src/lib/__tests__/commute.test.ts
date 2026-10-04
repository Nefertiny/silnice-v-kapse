import { adviceFor, directionAt, reminderMinute, type Commute } from '../commute';

const COMMUTE: Commute = {
  home: { query: 'Hradec Králové', name: 'Hradec Králové', label: 'Hradec Králové', position: [15.8327, 50.2104] },
  work: { query: 'Pardubice', name: 'Pardubice', label: 'Pardubice', position: [15.7812, 50.0343] },
  arriveBy: 8 * 60,
  remind: true,
  usualToWork: 30,
  usualToHome: 32,
};

const at = (h: number, m = 0) => new Date(2026, 9, 5, h, m);

describe('cesta do práce', () => {
  it('shows the way to work in the morning and home in the afternoon', () => {
    expect(directionAt(at(6, 30))).toBe('work');
    expect(directionAt(at(11, 59))).toBe('work');
    expect(directionAt(at(12, 0))).toBe('home');
    expect(directionAt(at(16, 45))).toBe('home');
  });

  it('says when to leave at the latest, with time to park', () => {
    // 8:00 v práci, dnes 42 min (o 12 víc než obvykle), 5 min rezerva → vyrazit v 7:13.
    expect(adviceFor(COMMUTE, 'work', 42, at(6, 50))).toEqual({ leaveAt: '7:13', arriveNow: '7:32', late: false, extra: 12 });
  });

  it('warns when it is already too late to arrive on time', () => {
    expect(adviceFor(COMMUTE, 'work', 42, at(7, 20))).toMatchObject({ leaveAt: '7:13', arriveNow: '8:02', late: true });
  });

  it('stops giving advice after the start of work and on the way home', () => {
    expect(adviceFor(COMMUTE, 'work', 30, at(8, 30))).toEqual({ arriveNow: '9:00', late: false, extra: 0 });
    expect(adviceFor(COMMUTE, 'home', 40, at(16, 0))).toEqual({ arriveNow: '16:40', late: false, extra: 8 });
  });

  it('reminds 20 minutes before the usual departure', () => {
    // 8:00 − 30 min jízdy − 5 min rezerva − 20 min = 7:05.
    expect(reminderMinute(COMMUTE)).toBe(7 * 60 + 5);
    expect(reminderMinute({ ...COMMUTE, arriveBy: 30, usualToWork: 90 })).toBe(0);
  });
});
