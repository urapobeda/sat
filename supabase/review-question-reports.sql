-- Read in Supabase SQL Editor as a project administrator.
select r.created_at, r.id, r.question_id, q.source_question_id, q.section, q.topic,
       r.reason, r.details
from public.question_reports as r
join public.questions as q on q.id = r.question_id
order by r.created_at desc
limit 100;
