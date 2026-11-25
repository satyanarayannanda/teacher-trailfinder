export const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export type Status = 'Available' | 'Busy' | 'On Search';
export interface Schedule { id: string; teacher_id: string; day_of_week: number; start_time: string; end_time: string; activity: string; location: string; type: string }
export interface Teacher { id: string; name: string; department_id: string; cabin: string; email: string; designation: string; portrait: number; updated_at: string }
export interface Department { id: string; name: string }
export interface DaySlot { start: string; end: string; activity: string; location: string; type: string; status: Status }
export function calculateStatus(teacher: Pick<Teacher, 'cabin'>, entries: Schedule[], day: number, time: string) {
  const current = entries.find(e => e.day_of_week === day && e.start_time.slice(0,5) <= time.slice(0,5) && e.end_time.slice(0,5) > time.slice(0,5));
  if (!current || (current.type === 'Free' && !teacher.cabin)) return { status: 'On Search' as Status, activity: 'No scheduled activity', location: 'Current location unavailable', start: null, end: null };
  return { status: (current.type === 'Free' ? 'Available' : 'Busy') as Status, activity: current.activity, location: current.type === 'Free' ? `Cabin ${teacher.cabin}` : current.location, start: current.start_time, end: current.end_time };
}
export function campusTime(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return { day: days.indexOf(get('weekday')), time: `${get('hour')}:${get('minute')}` };
}
export function formatTime(time: string) { const [hour='0', minute='00'] = time.split(':'); const h = Number(hour); return `${h % 12 || 12}:${minute} ${h >= 12 ? 'PM' : 'AM'}`; }
export function overlaps(entries: Schedule[], candidate: Pick<Schedule, 'id'|'teacher_id'|'day_of_week'|'start_time'|'end_time'>) { return entries.some(e => e.id !== candidate.id && e.teacher_id === candidate.teacher_id && e.day_of_week === candidate.day_of_week && e.start_time < candidate.end_time && e.end_time > candidate.start_time); }
export function buildDaySchedule(teacher: Pick<Teacher, 'cabin'>, entries: Schedule[], day: number, startHour = 10, endHour = 18): DaySlot[] {
  const dayEntries = entries.filter(e => e.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time));
  const toSlot = (start: string, end: string, match: Schedule): DaySlot => match.type === 'Free'
    ? { start, end, activity: match.activity, location: teacher.cabin ? `Cabin ${teacher.cabin}` : 'Current location unavailable', type: match.type, status: teacher.cabin ? 'Available' : 'On Search' }
    : { start, end, activity: match.activity, location: match.location || '—', type: match.type, status: 'Busy' };
  const slots: DaySlot[] = [];
  for (let hour = startHour; hour < endHour; hour++) {
    const start = `${String(hour).padStart(2, '0')}:00`;
    const end = `${String(hour + 1).padStart(2, '0')}:00`;
    const matches = dayEntries.filter(e => e.start_time.slice(0, 5) < end && e.end_time.slice(0, 5) > start);
    if (matches.length === 0) {
      slots.push({ start, end, activity: 'No scheduled activity', location: '—', type: 'Unscheduled', status: 'On Search' });
    } else if (matches.length === 1 && matches[0]) {
      slots.push(toSlot(start, end, matches[0]));
    } else {
      for (const m of matches) {
        const s = m.start_time.slice(0, 5) > start ? m.start_time.slice(0, 5) : start;
        const e = m.end_time.slice(0, 5) < end ? m.end_time.slice(0, 5) : end;
        slots.push(toSlot(s, e, m));
      }
    }
  }
  return slots;
}