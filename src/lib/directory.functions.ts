import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { calculateStatus, campusTime } from './status';
import { timetableToSchedule } from './timetable-data';

export const getDirectory = createServerFn({ method: 'GET' }).handler(async () => {
  const url = process.env['SUPABASE_URL']; const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error('The college directory is not connected.');
  const db = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (input, init) => { const headers = new Headers(init?.headers); if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) headers.delete('Authorization'); headers.set('apikey',key); return fetch(input,{...init,headers}); } } });
  const [teachers, departments, schedules] = await Promise.all([db.from('teachers').select('*').order('name'), db.from('departments').select('*').order('id'), db.from('timetable').select('*').order('start_time').limit(1000)]);
  if (teachers.error || departments.error || schedules.error) throw new Error('Unable to load the college directory. Please try again.');
  const clock = campusTime(new Date());
  const entries = (schedules.data ?? []).map(timetableToSchedule);
  return { teachers: teachers.data ?? [], departments: departments.data ?? [], schedules: entries, liveStatuses: (teachers.data ?? []).map(t => ({ id: t.id, ...calculateStatus(t,entries.filter(s => s.teacher_id === t.id),clock.day,clock.time) })) };
});