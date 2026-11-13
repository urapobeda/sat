# Interactive practice papers

Practice Tests → Past Papers opens timed, interactive papers. Each question has
on-site answer controls. Module drafts and submitted results are saved in
Supabase. Correct keys are returned after the whole attempt is completed.

The source question layouts are preserved as individual WebP images. The runner
supports A–D choices, numeric/fraction responses, review flags, navigation,
module deadlines, refresh/resume, and answer review. Math formulas and figures
are preserved in the question images.

## Database

Apply add_past_papers.sql first if the paper schema is missing, then
supabase/migrations/add_interactive_papers.sql.

The interactive migration has already been approved and applied to the current
Supabase project. It adds paper_items, paper_solutions and paper_module_runs.
Students cannot write scores or retrieve solution keys directly.

## Data preparation

Run from the repository root using Python with pypdfium2 and Pillow installed.

~~~powershell
python scripts/prepare-interactive-papers.py "C:/Users/zumad/Documents/Codex/2026-11-08/referenced-chatgpt-conversation-this-is-an/sat-practice-tests-organized.zip" data/math/interactive-papers --d7-dir "C:/Users/zumad/Downloads/Telegram Desktop" --d7-keys data/math/papers-work/d7-verified-keys.json
node scripts/import-interactive-papers.mjs data/math/interactive-papers --dry-run
node scripts/import-interactive-papers.mjs data/math/interactive-papers
~~~

The preparation output contains private keys. Keep it outside public assets and
version control. The importer uses the existing server-side Supabase credentials.

Existing paper slugs and module IDs are reused. Existing question content and
keys must match on retry. Images use content-based names. Student attempts are
preserved. Existing publication status is retained. New papers are staged as
unpublished. To publish staged papers, supply actual source permission details
using PRACTICE_PAPER_LICENSE_NOTES and pass --publish.

For the seven scanned D7SAT files, keys were transcribed from their answer-key
pages. Each of these tests uses its own question pages and keys. The May V1
module 2 question 13 and May V3 module 2 Math question 20 span two source pages.
The 2026 March V2 paper remains separate.

## Verification

~~~powershell
npm run lint
npx tsc --noEmit
npm run test:unit
npm run build
~~~

scripts/paper-attempts-sql.test.mjs additionally exercises the real migration
against a temporary PostgreSQL database using PGlite. Set PGLITE_PATH to an
external installation's dist/index.js before running it, or install PGlite in
your local test environment.

~~~sql
select count(*) from public.paper_items;
select count(*) from public.paper_solutions;
select is_published, count(*) from public.exam_papers
where slug like 'pdf-%' group by is_published;
~~~

Verify browser flows with a dedicated test attempt. Leave an existing student's
attempt untouched. Check module save, refresh, review marks, wrong/correct
answers, module submission, resume, and completed answer review.

## Rollback

To hide a specific imported paper, set is_published=false for that slug.
Retain the new tables, files and attempts to preserve student history.
Rolling back the app code may restore PDF viewing while these records remain.
