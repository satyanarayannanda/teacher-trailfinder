import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { GraduationCap, LayoutGrid, CalendarDays, ShieldCheck, Clock3, MapPin, ArrowUpRight, FlaskConical, Radio, Play, X, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { buildDaySchedule, campusTime, days, formatTime, calculateStatus, type Schedule, type Teacher, type Status } from '@/lib/status';
import { portraits } from '@/lib/portraits';
import { ThemeToggle } from '@/components/theme';

const ClockContext = createContext({ day: 0, time: '00:00', demo: false, setDemo: (_: boolean) => {}, setDay: (_: number) => {}, setTime: (_: string) => {}, now: new Date(0) });
export function CollegeShell({children}: {children: ReactNode}) {
  const [now,setNow] = useState(new Date(0)); const [demo,setDemo] = useState(false); const [day,setDay] = useState(1); const [time,setTime] = useState('10:30'); const [showDemo,setShowDemo] = useState(false);
  useEffect(()=>{ setNow(new Date()); const id = setInterval(()=>setNow(new Date()),15000); return ()=>clearInterval(id); },[]);
  const live = campusTime(now);
  return <ClockContext.Provider value={{day: demo ? day : live.day,time: demo ? time : live.time,demo,setDemo,setDay,setTime,now}}>
    <header className="site-header"><div className="nav-inner"><Link to="/" className="brand"><span className="brand-mark"><GraduationCap size={25}/></span><span><span className="text-primary">Uni</span>Tracker<small>YOUR CAMPUS, CONNECTED</small></span></Link><nav aria-label="Main navigation"><Link to="/" activeProps={{className:'nav-link active'}} className="nav-link"><LayoutGrid/>Find a teacher</Link><Link to="/timetable" activeProps={{className:'nav-link active'}} className="nav-link"><CalendarDays/>Timetable</Link></nav><div className="nav-actions"><ThemeToggle/><Button variant="outline" onClick={()=>setShowDemo(v=>!v)} className={demo ? 'demo-active' : ''}><FlaskConical/>{demo?'Demo on':'Demo mode'}</Button><Button asChild variant="ghost"><Link to="/admin"><ShieldCheck/><span className="admin-label">Admin</span></Link></Button></div></div></header>
    {showDemo && <section className="demo-bar"><div className="page-width demo-inner"><span className="demo-title"><FlaskConical size={18}/>Presentation clock</span><label className="inline-control">Demo mode <Switch checked={demo} onCheckedChange={setDemo}/></label><select aria-label="Demo day" value={day} onChange={e=>{setDay(Number(e.target.value));setDemo(true);}}>{days.map((d,i)=><option key={d} value={i}>{d}</option>)}</select><input aria-label="Demo time" type="time" value={time} onChange={e=>{setTime(e.target.value);setDemo(true);}}/><Button variant="ghost" size="sm" onClick={()=>{setDay(1);setTime('10:30');setDemo(true);}}><Play/>10:30 AM</Button><Button variant="ghost" size="sm" onClick={()=>{setDay(1);setTime('11:30');setDemo(true);}}><Play/>11:30 AM</Button><Button variant="ghost" size="icon" aria-label="Close demo controls" onClick={()=>setShowDemo(false)}><X/></Button></div></section>}
    {children}<footer className="site-footer page-width"><span><GraduationCap size={17}/> Teacher Finder <span className="footer-divider">/</span> A little less searching. A little more learning.</span><span><span className="live-dot"/>Campus time · Asia/Kolkata</span></footer>
  </ClockContext.Provider>;
}
export function useClock() { return useContext(ClockContext); }
export function StatusBadge({status}: {status: Status}) { return <span className={`status-badge ${status === 'Available'?'available':status==='Busy'?'busy':'searching'}`}><span/>{status}</span>; }
export function ClockPanel() { const c=useClock(); return <div className="clock-panel"><div><span className={`live-label ${c.demo?'demo-label':''}`}><Radio size={14}/>{c.demo?'SIMULATED CAMPUS TIME':'LIVE CAMPUS TIME'}</span><strong>{formatTime(c.time)}</strong></div><div className="clock-date"><b>{days[c.day]}</b><span>{c.now.getTime() ? c.now.toLocaleDateString('en-GB',{timeZone:'Asia/Kolkata',day:'numeric',month:'long',year:'numeric'}) : 'Campus clock'}</span></div></div>; }
export function TeacherCard({teacher,schedules,department}: {teacher: Teacher;schedules: Schedule[];department: string}) { const c=useClock(); const state=calculateStatus(teacher,schedules,c.day,c.time); return <article className="teacher-card"><div className="teacher-card-top"><img className="portrait" src={portraits[teacher.portrait % portraits.length]} alt={teacher.name}/><StatusBadge status={state.status}/></div><h3>{teacher.name}</h3><p className="designation">{teacher.designation}</p><span className="department-label">{department}</span><div className="teacher-current"><div><MapPin/><span><small>CURRENT LOCATION</small><strong>{state.location}</strong></span></div><div><Clock3/><span><small>CURRENT ACTIVITY</small><strong>{state.activity}</strong></span></div></div><div className="teacher-card-bottom"><span>{state.end?`Until ${formatTime(state.end)}`:'No current time slot'}</span><Button asChild variant="ghost" size="sm"><Link to="/teachers/$id" params={{id:teacher.id}}>View profile<ArrowUpRight/></Link></Button></div></article>; }
export function WeeklyTable({schedules,teachers}: {schedules: Schedule[];teachers: Teacher[]}) { const [day,setDay]=useState(1); const entries=schedules.filter(s=>s.day_of_week===day).sort((a,b)=>a.start_time.localeCompare(b.start_time)); return <section className="weekly-section"><div className="day-tabs" role="tablist" aria-label="Weekday">{[1,2,3,4,5,6,0].map(d=><Button role="tab" aria-selected={day===d} key={d} variant={day===d?'secondary':'ghost'} onClick={()=>setDay(d)}>{days[d]}</Button>)}</div><div className="table-scroll"><table><thead><tr><th>Time</th><th>Teacher</th><th>Activity</th><th>Location</th><th>Type</th></tr></thead><tbody>{entries.map(s=><tr key={s.id}><td className="time-cell">{formatTime(s.start_time)} – {formatTime(s.end_time)}</td><td>{teachers.find(t=>t.id===s.teacher_id)?.name}</td><td>{s.activity}</td><td><span className="table-location"><MapPin size={14}/>{s.location||'—'}</span></td><td><span className={`type-label ${s.type.toLowerCase()}`}>{s.type}</span></td></tr>)}</tbody></table>{entries.length===0&&<div className="empty-state"><CalendarDays/><h3>No classes scheduled</h3><p>No timetable entries for {days[day]}.</p></div>}</div></section>; }
export function TeacherDaySchedule({teacher,schedules}: {teacher: Teacher;schedules: Schedule[]}) {
  const clock = useClock();
  const [day, setDay] = useState(1);
  const slots = buildDaySchedule(teacher, schedules, day, 10, 18);
  const nowTime = clock.time.slice(0, 5);
  return <section className="weekly-section">
    <div className="day-tabs" role="tablist" aria-label="Weekday">{[1,2,3,4,5,6,0].map(d=><Button role="tab" aria-selected={day===d} key={d} variant={day===d?'secondary':'ghost'} onClick={()=>setDay(d)}>{days[d]}</Button>)}</div>
    <div className="table-scroll">
      <table>
        <thead><tr><th>Time</th><th>Activity</th><th>Location</th><th>Type</th><th>Status</th></tr></thead>
        <tbody>{slots.map(slot=>{
          const isNow = clock.day === day && slot.start <= nowTime && slot.end > nowTime;
          const unscheduled = slot.type === 'Unscheduled';
          return <tr key={`${slot.start}-${slot.end}-${slot.activity}`} className={`${isNow ? 'current-slot' : ''} ${unscheduled ? 'unscheduled-row' : ''}`}>
            <td className="time-cell">{formatTime(slot.start)} – {formatTime(slot.end)}{isNow && <span className="now-pill">Now</span>}</td>
            <td>{slot.activity}</td>
            <td><span className="table-location"><MapPin size={14}/>{slot.location}</span></td>
            <td><span className={`type-label ${slot.type.toLowerCase()}`}>{slot.type}</span></td>
            <td><StatusBadge status={slot.status}/></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </section>;
}
export function Contact({teacher}: {teacher:Teacher}) { return <a className="contact-link" href={`mailto:${teacher.email}`}><Mail size={16}/>{teacher.email}</a>; }