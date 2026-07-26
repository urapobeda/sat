with paper_rows as (
  insert into public.exam_papers (
    slug,
    title,
    description,
    paper_type,
    mode,
    difficulty,
    year,
    source_type,
    source_name,
    license_notes,
    is_published,
    is_featured,
    estimated_minutes
  )
  values
    (
      'demo-adaptive-full-test',
      'Demo Adaptive Full Test',
      'A demo full-length Digital SAT-style paper assembled from original SAT Practice Hub questions.',
      'full-length',
      'adaptive',
      'standard',
      2026,
      'original',
      'SAT Practice Hub',
      'Original demo content created for SAT Practice Hub. Not affiliated with or endorsed by College Board.',
      exists (select 1 from public.questions),
      true,
      194
    ),
    (
      'demo-reading-writing-section',
      'Demo Reading & Writing Section',
      'A focused Reading & Writing section assembled from original practice questions.',
      'reading-writing',
      'linear',
      'foundation',
      2026,
      'original',
      'SAT Practice Hub',
      'Original demo content created for SAT Practice Hub. Not affiliated with or endorsed by College Board.',
      exists (select 1 from public.questions where section = 'reading-writing'),
      false,
      64
    ),
    (
      'demo-math-section',
      'Demo Math Section',
      'A focused Math section assembled from original practice questions.',
      'math',
      'linear',
      'foundation',
      2026,
      'original',
      'SAT Practice Hub',
      'Original demo content created for SAT Practice Hub. Not affiliated with or endorsed by College Board.',
      exists (select 1 from public.questions where section = 'math'),
      false,
      70
    )
  on conflict (slug) do update
  set
    title = excluded.title,
    description = excluded.description,
    paper_type = excluded.paper_type,
    mode = excluded.mode,
    difficulty = excluded.difficulty,
    year = excluded.year,
    source_type = excluded.source_type,
    source_name = excluded.source_name,
    license_notes = excluded.license_notes,
    is_published = excluded.is_published,
    is_featured = excluded.is_featured,
    estimated_minutes = excluded.estimated_minutes,
    updated_at = now()
  returning id, slug
),
all_papers as (
  select id, slug
  from public.exam_papers
  where slug in (
    'demo-adaptive-full-test',
    'demo-reading-writing-section',
    'demo-math-section'
  )
),
module_rows as (
  insert into public.exam_modules (
    paper_id,
    section,
    module_number,
    route_type,
    duration_seconds,
    question_count,
    sort_order
  )
  select paper_id, section, module_number, route_type, duration_seconds, question_count, sort_order
  from (
    select id as paper_id, 'reading-writing' as section, 1 as module_number, 'base' as route_type, 1920 as duration_seconds, 10 as question_count, 1 as sort_order
    from all_papers where slug = 'demo-adaptive-full-test'
    union all
    select id, 'reading-writing', 2, 'harder', 1920, 10, 2
    from all_papers where slug = 'demo-adaptive-full-test'
    union all
    select id, 'math', 1, 'base', 2100, 10, 3
    from all_papers where slug = 'demo-adaptive-full-test'
    union all
    select id, 'math', 2, 'harder', 2100, 10, 4
    from all_papers where slug = 'demo-adaptive-full-test'
    union all
    select id, 'reading-writing', 1, 'base', 3840, 20, 1
    from all_papers where slug = 'demo-reading-writing-section'
    union all
    select id, 'math', 1, 'base', 4200, 20, 1
    from all_papers where slug = 'demo-math-section'
  ) modules
  on conflict do nothing
  returning id, paper_id, section, sort_order
),
all_modules as (
  select exam_modules.id, exam_modules.paper_id, exam_modules.section, exam_modules.sort_order
  from public.exam_modules
  join all_papers on all_papers.id = exam_modules.paper_id
),
ranked_questions as (
  select
    id,
    section,
    row_number() over (partition by section order by created_at, id) as question_rank
  from public.questions
)
insert into public.exam_module_questions (module_id, question_id, sort_order)
select
  module.id,
  question.id,
  row_number() over (partition by module.id order by question.question_rank) as sort_order
from all_modules module
join ranked_questions question on question.section = module.section
where question.question_rank between ((module.sort_order - 1) * 10 + 1) and (module.sort_order * 10)
on conflict do nothing;
