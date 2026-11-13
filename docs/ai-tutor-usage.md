# AI Tutor daily quota

## Deployment order

1. Run `supabase/migrations/add_ai_tutor_usage.sql` in the Supabase SQL Editor.
2. Run the verification queries below.
3. Deploy the application changes. Existing server environment variables are
   required: `SUPABASE_SERVICE_ROLE_KEY`, Supabase URL, and OpenAI configuration.
   Never put the service-role key in a `NEXT_PUBLIC_*` variable.

This migration has not been applied to production by the coding agent. It is
idempotent and preserves existing usage records and student results.

Authenticated users receive 30 requests per UTC calendar day. A request is counted
when the database reserves quota before the AI call. An upstream AI failure still
counts. Invalid bodies and guest requests do not consume quota. Database failures
deny the AI call with 503; exhausted quota returns 429; guests return 401.

Clients can read only their own usage. They cannot modify counters or invoke the
reservation function. Only the server verifies the bearer token and passes that
user ID to the service-role-only function. Its atomic upsert enforces the cap
across workers, tabs and devices.

## Read-only verification SQL

```sql
select relname, relrowsecurity
from pg_class
where oid = 'public.ai_tutor_usage'::regclass;

select policyname, roles, cmd, qual
from pg_policies
where schemaname = 'public' and tablename = 'ai_tutor_usage';

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'ai_tutor_usage';

select
  has_function_privilege('anon', 'public.consume_ai_tutor_usage(uuid)', 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', 'public.consume_ai_tutor_usage(uuid)', 'EXECUTE') as student_execute,
  has_function_privilege('service_role', 'public.consume_ai_tutor_usage(uuid)', 'EXECUTE') as server_execute;
-- Expected: false, false, true.

select count(*) as invalid_counters
from public.ai_tutor_usage where count < 0 or count > 30;
-- Expected: 0.
```

## Rollback without deleting data

To stop AI calls while investigating deployment issues, revoke the server's RPC
permission. The route fails closed. Keep the table and all recorded usage:

```sql
revoke execute on function public.consume_ai_tutor_usage(uuid) from service_role;
```

Reapply this migration to restore access. Do not restore the old cookie-based
route, which would bypass the database quota.

## Local verification

`npm run test:unit` includes mocked tests of the actual route, without paid AI
calls. The PostgreSQL migration test uses an optional external PGlite install:

```powershell
$env:PGLITE_PATH = 'absolute/path/to/@electric-sql/pglite/dist/index.js'
node scripts/ai-tutor-usage-sql.test.mjs
```

It checks repeated migration execution, preserved counters, the 30-request cap,
parallel calls, distinct days, cross-user isolation, and denied client writes/RPC.
