import { describe, expect, it } from 'vitest';
import { timetableDay, timetableToSchedule } from './timetable-data';
import { calculateStatus } from './status';

const row = { id: 'entry', teacher_id: 'teacher', day_of_week: 'Monday',
  start_time: '10:00:00', end_time: '11:00:00', activity: 'Lecture',
  location: 'C-204', type: 'Lecture', created_at: '2026-11-25T19:10:00Z' };

describe('Persistent timetable compatibility', () => {
  it('converts stored text weekdays for the existing status calculation', () => {
    const entry = timetableToSchedule(row);
    expect(entry.day_of_week).toBe(1);
    expect(calculateStatus({ cabin: 'C-305' }, [entry], 1, '10:30'))
      .toMatchObject({ status: 'Busy', location: 'C-204' });
  });
  it('writes weekdays as text rather than numeric database values', () => {
    expect(timetableDay(1)).toBe('Monday');
    expect(timetableDay(0)).toBe('Sunday');
    expect(timetableDay(6)).toBe('Saturday');
    expect(() => timetableDay(7)).toThrow('Invalid timetable weekday.');
  });
  it('handles optional timetable fields without inventing activities', () => {
    expect(timetableToSchedule({ ...row, location: null, type: null }))
      .toMatchObject({ location: '', type: '', activity: 'Lecture' });
  });
});