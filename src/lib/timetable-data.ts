import type { Database } from '@/integrations/supabase/types';
import { days, type Schedule } from './status';

type TimetableRow = Database['public']['Tables']['timetable']['Row'];

// Keep the existing numeric-day UI and shared status service unchanged.
export function timetableToSchedule(row: TimetableRow): Schedule {
  const day = days.indexOf(row.day_of_week);
  if (day < 0) throw new Error('Invalid timetable weekday.');
  return { id: row.id, teacher_id: row.teacher_id, day_of_week: day,
    start_time: row.start_time, end_time: row.end_time, activity: row.activity,
    location: row.location ?? '', type: row.type ?? '' };
}

export function timetableDay(day: number): string {
  const name = days[day];
  if (!name) throw new Error('Invalid timetable weekday.');
  return name;
}