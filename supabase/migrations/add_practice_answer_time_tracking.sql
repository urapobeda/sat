-- Adds per-question timing to practice answers so Question Bank analytics
-- (time share by difficulty) can be computed from real data instead of
-- placeholders. Run this once if your practice_answers table predates it.

alter table public.practice_answers
  add column if not exists time_spent_seconds integer;
