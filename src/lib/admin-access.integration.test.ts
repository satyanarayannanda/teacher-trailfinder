// Live database regressions; run in the Lovable sandbox with its read-only CLI.
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function query(sql: string): Record<string, unknown> {
  const output = execFileSync('lovable', ['supabase', 'query', sql, '--json'], {
    encoding: 'utf8',
    timeout: 30_000,
  });
  const result = JSON.parse(output) as { rows: Record<string, unknown>[] };
  const row = result.rows[0];
  if (!row) throw new Error('Access regression query returned no rows.');
  return row;
}

describe('Database-enforced admin approvals', () => {
  it('preserves the owner-approved Gmail account', () => {
    expect(query("SELECT public.has_role(id, 'admin') AS allowed FROM auth.users WHERE email = 'satyanarayannanda09@gmail.com'")['allowed']).toBe(true);
  });

  it('preserves the separately approved Gmail account', () => {
    expect(query("SELECT public.has_role(id, 'admin') AS allowed FROM auth.users WHERE email = 'samarthsharma1337@gmail.com'")['allowed']).toBe(true);
  });

  it('denies an existing verified account outside the approved Gmail list', () => {
    expect(query("SELECT public.has_role(id, 'admin') AS allowed FROM auth.users WHERE email = '26cd1sa129@mitsgwl.ac.in'")['allowed']).toBe(false);
  });

  it('prevents signed-in users from adding their own approval', () => {
    expect(query("SELECT has_table_privilege('authenticated', 'public.admin_email_allowlist', 'INSERT') AS allowed")['allowed']).toBe(false);
  });

  it('prevents signed-in users from changing existing approvals', () => {
    expect(query("SELECT has_table_privilege('authenticated', 'public.admin_email_allowlist', 'UPDATE') AS allowed")['allowed']).toBe(false);
  });

  it('prevents anonymous users from approving themselves', () => {
    expect(query("SELECT has_table_privilege('anon', 'public.admin_email_allowlist', 'INSERT') AS allowed")['allowed']).toBe(false);
  });
});