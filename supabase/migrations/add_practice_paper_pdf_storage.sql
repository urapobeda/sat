-- Apply after add_past_papers.sql.
insert into storage.buckets (id, name, public, allowed_mime_types)
values ('practice-papers', 'practice-papers', false, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists "Students can read published practice PDFs" on storage.objects;
create policy "Students can read published practice PDFs"
on storage.objects for select to authenticated
using (
  bucket_id = 'practice-papers'
  and exists (
    select 1 from public.exam_papers
    where exam_papers.is_published
      and exam_papers.slug like 'pdf-%'
      and storage.objects.name = exam_papers.slug || '/questions.pdf'
  )
);

grant select, insert, update on public.exam_papers, public.exam_modules to service_role;
n