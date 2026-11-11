# Practice test PDFs

The Practice Tests page links to Past Papers. Signed-in students can open a
published paper's question PDF from its details page. Answer PDFs and reference
PDFs are stored privately for administrators. These papers use PDF viewing.

1. In the target project's SQL Editor, check whether the existing Past Papers
   schema is present:

   ```sql
   select to_regclass('public.exam_papers'), to_regclass('public.exam_modules');
   ```

2. If the Past Papers schema is absent, run
   `supabase/migrations/add_past_papers.sql` first. Then run
   `supabase/migrations/add_practice_paper_pdf_storage.sql`. Verify that
     `practice-papers` is private:

   ```sql
   select id, public from storage.buckets where id = 'practice-papers';
   ```

3. Prepare the organized archive using Python with `pypdfium2` installed:

   ```powershell
   python scripts/prepare-practice-paper-pdfs.py "PATH_TO_ORGANIZED_ZIP" "UPLOAD_FOLDER" --d7-dir "PATH_TO_D7_PDFS"
   node scripts/import-practice-paper-pdfs.mjs "UPLOAD_FOLDER" --dry-run
   node scripts/import-practice-paper-pdfs.mjs "UPLOAD_FOLDER"
   ```

   The last command stages the files and database rows as unpublished. Run from
   the repository root with the existing server-only Supabase credentials in
   `.env.local`. Keep the upload folder outside the repository.

4. After confirming permission to publish the TalimSAT and D7SAT sources, set
   `PRACTICE_PAPER_LICENSE_NOTES` in the shell to the actual permission details
   and repeat the import with `--publish`. Deploy the application changes.

   ```sql
   select is_published, count(*) from public.exam_papers
   where slug like 'pdf-%' group by is_published;
   ```

   Sign in as a student, open one full-length paper and one Verbal only paper,
   and verify that their question PDFs open. A direct unsigned URL and a
   student request for an answer PDF should both be denied.

To roll back visibility, set `is_published = false` on the specific affected
paper slugs. Previously issued PDF links may remain valid until they expire
(up to 30 minutes). This preserves stored files and student data.
