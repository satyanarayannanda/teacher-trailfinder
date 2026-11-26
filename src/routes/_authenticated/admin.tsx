import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ShieldCheck, Plus, Pencil, Trash2, LogOut, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { directoryOptions } from '@/lib/directory';
import { getAdminAccess } from '@/lib/admin.functions';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AdminEditor, type AdminTab } from '@/components/admin-editor';
import { days, formatTime } from '@/lib/status';

const accessOptions = queryOptions({ queryKey: ['admin-access'], queryFn: () => getAdminAccess(), staleTime: 0 });

export const Route = createFileRoute('/_authenticated/admin')({
  head: () => ({
    meta: [
      { title: 'Admin Dashboard · Teacher Finder' },
      { name: 'description', content: 'Manage college teachers, departments and weekly schedules.' },
      { property: 'og:title', content: 'Admin Dashboard · Teacher Finder' },
      { property: 'og:description', content: 'Secure faculty and timetable management.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([context.queryClient.ensureQueryData(directoryOptions), context.queryClient.ensureQueryData(accessOptions)]);
  },
  component: Admin,
});

function Admin() {
  const { data } = useSuspenseQuery(directoryOptions);
  const { data: allowed } = useSuspenseQuery(accessOptions);
  const [tab, setTab] = useState<AdminTab>('teachers');
  const [editing, setEditing] = useState<Record<string, unknown> | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();
  const qc = useQueryClient();

  const teacherName = (id: string) => data.teachers.find(t => t.id === id)?.name ?? 'Unknown';
  const sortedSchedules = data.schedules
    .filter(s => filter === 'all' || s.teacher_id === filter)
    .slice()
    .sort((a, b) => teacherName(a.teacher_id).localeCompare(teacherName(b.teacher_id)) || a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));

  const rows = tab === 'teachers'
    ? data.teachers.map(row => ({ kind: 'teacher' as const, row }))
    : tab === 'departments'
      ? data.departments.map(row => ({ kind: 'department' as const, row }))
      : sortedSchedules.map(row => ({ kind: 'schedule' as const, row }));

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    await navigate({ to: '/auth', replace: true });
  }

  async function remove(id: string) {
    if (!window.confirm(tab === 'teachers' ? 'Delete this teacher and their entire timetable?' : 'Delete this record?')) return;
    setError('');
    const table = tab === 'schedules' ? 'timetable' : tab;
    const { error: delError } = await supabase.from(table).delete().eq('id', id);
    if (delError) {
      setError(delError.message);
    } else {
      await qc.invalidateQueries({ queryKey: ['directory'] });
      toast.success(tab === 'teachers' ? 'Teacher deleted.' : tab === 'departments' ? 'Department deleted.' : 'Timetable entry deleted.');
    }
  }

  function openTeacherTimetable(teacherId: string) {
    setFilter(teacherId);
    setTab('schedules');
  }

  if (!allowed) {
    return (
      <main className="page-width access-state">
        <ShieldCheck size={40} />
        <h1>You’re signed in.</h1>
        <p>Your account has normal access. Teacher and timetable editing is reserved for approved campus administrators.</p>
        <div className="flex justify-center gap-3">
          <Button asChild><Link to="/">Find a teacher</Link></Button>
          <Button variant="outline" onClick={() => void signOut()}>Sign out</Button>
        </div>
      </main>
    );
  }

  const headers = tab === 'teachers'
    ? ['Name', 'Department', 'Cabin', 'Email', 'Timetable', 'Actions']
    : tab === 'departments'
      ? ['Code', 'Department', 'Actions']
      : ['Teacher', 'Day', 'Time', 'Activity', 'Location', 'Type', 'Actions'];

  return (
    <main className="page-width">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><ShieldCheck size={15} />CAMPUS ADMINISTRATION</div>
          <h1>Admin dashboard</h1>
          <p>Keep your campus directory up to date.</p>
        </div>
        <Button variant="outline" onClick={() => void signOut()}><LogOut />Sign out</Button>
      </div>
      <div className="admin-tabs">
        {(['teachers', 'schedules', 'departments'] as const).map(t => (
          <Button key={t} variant={tab === t ? 'secondary' : 'ghost'} onClick={() => setTab(t)}>
            {t === 'schedules' ? `Timetable (${data.schedules.length})` : t === 'teachers' ? `Teachers (${data.teachers.length})` : `Departments (${data.departments.length})`}
          </Button>
        ))}
      </div>
      <div className="admin-toolbar">
        <h2 className="section-title">
          {tab === 'teachers' ? `${data.teachers.length} teachers` : tab === 'departments' ? `${data.departments.length} departments` : `${sortedSchedules.length} timetable entries`}
        </h2>
        <div className="flex gap-3">
          {tab === 'schedules' && (
            <select aria-label="Admin timetable teacher" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">All teachers</option>
              {data.teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <Button onClick={() => setEditing(null)}><Plus />Add {tab === 'teachers' ? 'teacher' : tab === 'departments' ? 'department' : 'entry'}</Button>
        </div>
      </div>
      {error && <div className="form-message" role="alert">{error}</div>}
      <div className="table-scroll">
        <table>
          <thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map(({ kind, row }) => (
              <tr key={row.id}>
                {kind === 'teacher' ? (
                  <>
                    <td>{row.name}</td>
                    <td>{row.department || row.department_id}</td>
                    <td>{row.cabin || '—'}</td>
                    <td>{row.email || '—'}</td>
                    <td>
                      <Button variant="ghost" size="sm" onClick={() => openTeacherTimetable(row.id)}>
                        <Calendar />{data.schedules.filter(s => s.teacher_id === row.id).length} entries
                      </Button>
                    </td>
                  </>
                ) : kind === 'schedule' ? (
                  <>
                    <td>{teacherName(row.teacher_id)}</td>
                    <td>{days[row.day_of_week]}</td>
                    <td className="time-cell">{formatTime(row.start_time)} – {formatTime(row.end_time)}</td>
                    <td>{row.activity}</td>
                    <td>{row.location || '—'}</td>
                    <td>{row.type || '—'}</td>
                  </>
                ) : (
                  <>
                    <td>{row.id}</td>
                    <td>{row.name}</td>
                  </>
                )}
                <td>
                  <div className="row-actions">
                    <Button variant="ghost" size="icon" aria-label="Edit record" onClick={() => setEditing({ ...row })}><Pencil /></Button>
                    <Button variant="ghost" size="icon" aria-label="Delete record" onClick={() => void remove(row.id)}><Trash2 /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing !== undefined && (
        <AdminEditor
          tab={tab}
          row={editing}
          teachers={data.teachers}
          departments={data.departments}
          schedules={data.schedules}
          {...(tab === 'schedules' && filter !== 'all' ? { defaultTeacherId: filter } : {})}
          onClose={() => setEditing(undefined)}
        />
      )}
    </main>
  );
}