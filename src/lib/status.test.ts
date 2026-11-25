import { describe, expect, it } from 'vitest';
import { buildDaySchedule, calculateStatus, campusTime, overlaps, type Schedule } from './status';
const entries: Schedule[] = [
 {id:'1',teacher_id:'t',day_of_week:1,start_time:'10:00:00',end_time:'11:00:00',activity:'CSE Lecture',location:'C-204',type:'Lecture'},
 {id:'2',teacher_id:'t',day_of_week:1,start_time:'11:00:00',end_time:'12:00:00',activity:'Free',location:'',type:'Free'},
 {id:'3',teacher_id:'t',day_of_week:1,start_time:'13:00:00',end_time:'14:00:00',activity:'Lab',location:'Lab-2',type:'Lab'},
];
describe('Timetable-derived status',()=>{
 it('Monday 10:30 is busy in C-204',()=>expect(calculateStatus({cabin:'C-305'},entries,1,'10:30')).toMatchObject({status:'Busy',location:'C-204'}));
 it('Monday 11:30 is available in cabin C-305',()=>expect(calculateStatus({cabin:'C-305'},entries,1,'11:30')).toMatchObject({status:'Available',location:'Cabin C-305'}));
 it('Monday 13:30 is busy in Lab-2',()=>expect(calculateStatus({cabin:'C-305'},entries,1,'13:30')).toMatchObject({status:'Busy',location:'Lab-2'}));
 it('An unknown time does not assume a teacher is in their cabin',()=>expect(calculateStatus({cabin:'C-305'},entries,1,'12:30')).toMatchObject({status:'On Search',location:'Current location unavailable'}));
 it('A free period without a cabin has no known location',()=>expect(calculateStatus({cabin:''},entries,1,'11:30').status).toBe('On Search'));
 it('The next activity begins exactly at the end boundary',()=>expect(calculateStatus({cabin:'C-305'},entries,1,'11:00').status).toBe('Available'));
 it('Uses the actual campus day across a UTC midnight boundary',()=>expect(campusTime(new Date('2026-11-25T18:30:00Z'))).toEqual({day:4,time:'00:00'}));
 it('Rejects intersecting timetable slots',()=>expect(overlaps(entries,{id:'new',teacher_id:'t',day_of_week:1,start_time:'10:30:00',end_time:'11:30:00'})).toBe(true));
 it('Allows adjacent slots',()=>expect(overlaps(entries,{id:'new',teacher_id:'t',day_of_week:1,start_time:'12:00:00',end_time:'13:00:00'})).toBe(false));
 it('Builds an all-day 10:00 to 18:00 schedule with 8 hourly slots',()=>{
  const slots=buildDaySchedule({cabin:'C-305'},entries,1);
  expect(slots).toHaveLength(8);
  expect(slots[0]).toMatchObject({start:'10:00',end:'11:00',activity:'CSE Lecture',location:'C-204',status:'Busy'});
  expect(slots[1]).toMatchObject({start:'11:00',end:'12:00',activity:'Free',location:'Cabin C-305',status:'Available'});
  expect(slots[2]).toMatchObject({start:'12:00',end:'13:00',activity:'No scheduled activity',type:'Unscheduled',status:'On Search'});
  expect(slots[7]).toMatchObject({start:'17:00',end:'18:00',type:'Unscheduled',status:'On Search'});
 });
 it('Spans multi-hour entries across each overlapping hour in the 10:00 to 18:00 view',()=>{
  const multi: Schedule[]=[{id:'m1',teacher_id:'t',day_of_week:3,start_time:'13:00:00',end_time:'15:00:00',activity:'Mechanics Lab',location:'Lab M-2',type:'Lab'}];
  const slots=buildDaySchedule({cabin:'M-210'},multi,3);
  expect(slots[3]).toMatchObject({start:'13:00',end:'14:00',activity:'Mechanics Lab',location:'Lab M-2',status:'Busy'});
  expect(slots[4]).toMatchObject({start:'14:00',end:'15:00',activity:'Mechanics Lab',location:'Lab M-2',status:'Busy'});
 });
});