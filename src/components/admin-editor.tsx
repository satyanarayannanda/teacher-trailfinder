import { useState } from 'react';
import { X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { days, overlaps, type Department, type Teacher, type Schedule } from '@/lib/status';
import { timetableDay } from '@/lib/timetable-data';

export type AdminTab = 'teachers' | 'departments' | 'schedules';

interface AdminEditorProps {
  tab: AdminTab;
  row: Record<string, unknown> | null;
  teachers: Teacher[];
  departments: Department[];
  schedules: Schedule[];
  defaultTeacherId?: string;
  onClose: () => void;
}

export function AdminEditor({ tab, row, teachers, departments, schedules, defaultTeacherId, onClose }: AdminEditorProps) {
  const [form, setForm] = useState<Record<string, string>>({
    id: String(row?.['id'] ?? ''),
    name: String(row?.['name'] ?? ''),
    department_id: String(row?.['department_id'] ?? departments[0]?.id ?? ''),
    cabin: String(row?.['cabin'] ?? ''),
    email: String(row?.['email'] ?? ''),
    designation: String(row?.['designation'] ?? 'Assistant Professor'),
    teacher_id: String(row?.['teacher_id'] ?? defaultTeacherId ?? teachers[0]?.id ?? ''),
    day_of_week: String(row?.['day_of_week'] ?? 1),
    start_time: String(row?.['start_time'] ?? '10:00').slice(0, 5),
    end_time: String(row?.['end_time'] ?? '11:00').slice(0, 5),
    activity: String(row?.['activity'] ?? ''),
    location: String(row?.['location'] ?? ''),
    type: String(row?.['type'] ?? 'Lecture'),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const value = (key: string) => form[key] ?? '';
  const change = (key: string, v: string) => setForm(f => ({ ...f, [key]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      let result;
      if (tab === 'teachers') {
        const name = value('name').trim();
        const deptId = value('department_id').trim();
        if (!name) throw new Error('Teacher name is required.');
        if (!deptId) throw new Error('Department is required.');
        const deptName = departments.find(d => d.id === deptId)?.name ?? deptId;
        const teacher = {
          name,
          department_id: deptId,
          department: deptName,
          cabin: value('cabin').trim(),
          email: value('email').trim(),
          designation: value('designation').trim() || 'Assistant Professor',
          updated_at: new Date().toISOString(),
        };
        result = row
          ? await supabase.from('teachers').update(teacher).eq('id', value('id'))
          : await supabase.from('teachers').insert(teacher);
      } else if (tab === 'departments') {
        const id = value('id').trim().toUpperCase();
        const name = value('name').trim();
        if (!id || !name) throw new Error('Department code and name are required.');
        result = row
          ? await supabase.from('departments').update({ name }).eq('id', id)
          : await supabase.from('departments').insert({ id, name });
      } else {
        const activity = value('activity').trim();
        if (!value('teacher_id')) throw new Error('Please select a teacher.');
        if (!activity) throw new Error('Activity is required.');
        const entry = {
          teacher_id: value('teacher_id'),
          day_of_week: Number(value('day_of_week')),
          start_time: `${value('start_time')}:00`,
          end_time: `${value('end_time')}:00`,
          activity,
          location: value('location').trim(),
          type: value('type'),
        };
        if (entry.start_time >= entry.end_time) throw new Error('End time must be later than start time.');
        if (overlaps(schedules, { ...entry, id: value('id') })) throw new Error('This time overlaps another timetable entry.');
        const payload = { ...entry, day_of_week: timetableDay(entry.day_of_week) };
        result = row
          ? await supabase.from('timetable').update(payload).eq('id', value('id'))
          : await supabase.from('timetable').insert(payload);
      }
      if (result.error) throw new Error(result.error.message);
      await qc.invalidateQueries({ queryKey: ['directory'] });
      const label = tab === 'teachers' ? 'Teacher' : tab === 'departments' ? 'Department' : 'Timetable entry';
      toast.success(`${label} ${row ? 'updated' : 'added'}.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save.');
    } finally {
      setSaving(false);
    }
  }

  const input = (key: string, label: string, type = 'text', required = true) => (
    <label key={key}>{label}<input required={required} type={type} value={value(key)} onChange={e => change(key, e.target.value)} /></label>
  );
  const title = `${row ? 'Edit' : 'Add'} ${tab === 'teachers' ? 'teacher' : tab === 'departments' ? 'department' : 'timetable entry'}`;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-label={title} className="editor" onClick={e => e.stopPropagation()}>
        <div className="editor-head">
          <h2>{title}</h2>
          <Button variant="ghost" size="icon" aria-label="Close editor" onClick={onClose}><X /></Button>
        </div>
        <form onSubmit={save}>
          <div className="editor-grid">
            {tab === 'teachers' ? (
              <>
                {input('name', 'Teacher name')}
                <label>Department<select value={value('department_id')} onChange={e => change('department_id', e.target.value)}>{departments.map(d => <option key={d.id} value={d.id}>{d.id} · {d.name}</option>)}</select></label>
                {input('designation', 'Designation', 'text', false)}
                {input('cabin', 'Cabin number', 'text', false)}
                {input('email', 'Email address', 'email', false)}
              </>
            ) : tab === 'departments' ? (
              <>
                {row ? <label>Department code<input disabled value={value('id')} /></label> : input('id', 'Department code')}
                {input('name', 'Department name')}
              </>
            ) : (
              <>
                <label className="full">Teacher<select value={value('teacher_id')} onChange={e => change('teacher_id', e.target.value)}>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
                <label>Day of week<select value={value('day_of_week')} onChange={e => change('day_of_week', e.target.value)}>{days.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label>
                <label>Type<select value={value('type')} onChange={e => change('type', e.target.value)}>{['Lecture', 'Lab', 'Meeting', 'Free'].map(t => <option key={t}>{t}</option>)}</select></label>
                {input('start_time', 'Start time', 'time')}
                {input('end_time', 'End time', 'time')}
                {input('activity', 'Activity')}
                {input('location', 'Location', 'text', value('type') !== 'Free')}
              </>
            )}
          </div>
          {error && <div className="form-message" role="alert">{error}</div>}
          <div className="editor-footer">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </form>
      </section>
    </div>
  );
}