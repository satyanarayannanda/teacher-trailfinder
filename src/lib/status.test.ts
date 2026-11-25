import { describe, expect, it } from 'vitest';
import { calculateStatus, campusTime, overlaps, type Schedule } from './status';
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
});