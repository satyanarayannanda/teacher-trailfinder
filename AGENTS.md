<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Application structure
- Keep admin Gmail approvals in the service-managed admin_email_allowlist table and require both a verified matching Auth email and a stored admin role in has_role; database policies and dashboard checks must share this decision so browser state cannot grant access.
- Keep timetable status calculation in one pure shared service, used by server reads and live/demo UI; this prevents differing availability rules.
- Store faculty and schedules in Cloud tables with public reads and role-restricted writes; the student directory must work without sign-in.
- Keep protected management pages under the client-only authenticated layout; browser sessions are unavailable during server rendering.
- Use Asia/Kolkata as the campus timezone for live timetable comparison; UTC and device timezone differences must not change the college day.
- Use teachers and timetable as the canonical faculty/schedule store; the retired schedule_entries table is historical only, preventing split read/write paths.
- Convert database weekday names to numeric UI days through timetable-data and back on writes; this preserves the shared status service and existing presentation.
- Synchronize teachers.department with the compatibility department code using database triggers; direct database writes and existing department filters must agree.
