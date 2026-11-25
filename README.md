# Teacher Finder

A college project that helps students find faculty using their weekly timetable and the current campus time, rather than an arbitrary manually set status.

## Problem statement
Students often walk between classrooms and cabins to find a teacher, without knowing if the teacher is teaching, meeting, or free. A fixed or manually updated status quickly becomes inaccurate.

## Proposed solution
Store teachers and weekly schedules in a persistent database. Compare the campus day and time against schedule entries to calculate current availability and location. Students can search the public directory; approved administrators maintain the data.

## Features
- Search by faculty name, department and current status.
- Live total, available, busy and on-search counts.
- Teacher cards, contact email, profile pages, current activity and location.
- Weekly timetable with day, department and faculty filters.
- Demo clock for a simulated day/time during a viva.
- Teacher, department and timetable add/edit/delete forms for approved admins.
- Email/password, Google and Lovable sign-in; signup confirmation and password recovery.
- Persistent sample data: 10 fictional teachers from CSE, ECE, IT and Mechanical, with Monday–Friday schedules.
- Mobile-friendly pages. Faculty portraits and example.edu contact addresses are fictional demonstration data.

## Simple architecture
```text
Student or administrator
        |
React pages (TanStack Router)
        |
Public server read / authenticated admin role check
        |
Lovable Cloud PostgreSQL + Auth
        |
Shared timetable status calculator
```

The UI is React. TanStack Start supplies routes and server functions in the same project, so no separate Express server is needed. Public data is loaded by one server function and cached with TanStack Query. The pure `calculateStatus` service is used both on the server and in the browser, where the clock can change without downloading the timetable again. Admin writes use the generated browser database client and are checked again by database row-level security. Server checks never trust a client-provided role.

## Database design
| Table | Main fields | Relationship |
|---|---|---|
| departments | id (code), name | One department has many teachers |
| teachers | id, name, department_id, cabin, email, designation, portrait, updated_at | Belongs to a department |
| schedule_entries | id, teacher_id, day_of_week, start_time, end_time, activity, location, type | Belongs to a teacher |
| user_roles | id, user_id, role | Protected role assignment linked to an auth account |

`day_of_week` uses Sunday=0 through Saturday=6. Times are campus-local, 24-hour values. Types are Lecture, Lab, Meeting and Free. Deleting a teacher removes their schedules. Departments with teachers cannot be deleted until those teachers are reassigned. A database trigger rejects overlapping time slots. Timetable changes update the teacher's last schedule update timestamp. Seed records live in the initial migration, not in localStorage or page-load code.

## Status calculation
1. Convert the real date to the Asia/Kolkata campus day/time.
2. Find an entry for that teacher and day where `start <= current time < end`.
3. Lecture, Lab or Meeting: **Busy**, show the entry location/activity.
4. Explicit Free entry with an assigned cabin: **Available**, show the cabin.
5. Missing entry or free entry without a cabin: **On Search**, show “Current location unavailable”. Never assume every gap is free.

Intervals include their start and exclude their end: at exactly 11:00 the 11:00 entry replaces the 10:00–11:00 entry. The live clock updates every 15 seconds; directory data refreshes every minute. Demo mode uses the same stored schedules and calculation service, changing only day/time. Demo does not change the database or claim to be live location tracking.

### Viva demonstration
Open **Demo mode**, enable the switch, and choose Monday:
- 10:30: Dr. Rajesh Sharma is Busy in C-204.
- 11:30: Available in Cabin C-305.
- 13:30: Busy in Lab-2.
- 12:30: On Search because no timetable entry covers that time.
Disable Demo mode to return to the real campus clock. Current campus location is inferred from the schedule, not GPS.

## Security and admin setup
Students do not need accounts to browse. New accounts have normal access and cannot edit faculty data. No public signup can grant itself the admin role. Roles are kept in a separate protected table, not in profiles or browser storage. There is intentionally no extra profiles table.

1. Create and confirm a campus account, or sign in with a supported social provider.
2. Ask the app owner to approve that account for admin access through Lovable. Supply the intended account email; an authorized project operator assigns its user ID the admin role in the protected `user_roles` table.
3. Open **Admin** to manage teachers, departments and timetables.

No administrator has been assigned yet. Normal signed-in users see an access message rather than editing controls. The admin editing flow cannot be verified as an approved administrator until an account is assigned. Do not enable all signed-in accounts to edit as a workaround.

Public SELECT policies expose faculty directory fields and schedules, including the displayed college contact email. INSERT, UPDATE and DELETE require an admin role. Database grants and RLS are both configured. Secret server credentials are never sent to the frontend. Google/Lovable OAuth returns to the public sign-in page before the protected admin page is opened. Password reset has a dedicated public page.

## Technology stack
React 19, TypeScript, TanStack Start/Router/Query, Tailwind CSS 4, Radix/shadcn controls, Lucide icons, Lovable Cloud PostgreSQL and authentication, Vitest.

## Setup instructions
This Lovable project is already connected to Cloud and has its initial schema and sample schedules applied.

For local development, clone your own connected repository, then:
```sh
bun install
bun run dev
```
Use the generated integration environment configuration supplied by Lovable. Browser configuration uses the public `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` variables; server configuration uses `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Do not commit private keys or .env files. Managed migrations are applied through Lovable and are stored in `drizzle/migrations`; do not edit an already applied migration.

Run the tests:
```sh
bunx vitest run
```
To deploy, publish the project in Lovable. Saving code is not the same as publishing it. Auth provider settings and redirect allowlists are maintained under More → Users → Auth settings.

## Main files
- `src/lib/status.ts`: pure status and time helpers.
- `src/lib/directory.functions.ts`: public database read and server-computed status.
- `src/lib/admin.functions.ts`: authenticated role verification.
- `src/components/college.tsx`: shared navigation, clock, cards and weekly table.
- `src/components/admin-editor.tsx`: validated management forms.
- `src/routes`: student, profile, timetable, sign-in, recovery and protected admin pages.

## Future improvements
Holiday calendar and semester dates; temporary schedule overrides; campus maps; import/export timetables; teacher-owned schedule editing with separate roles; pagination for larger colleges; audit history; teacher consent and real institutional contact information. These are not included in the current version.
