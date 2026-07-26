# SAT Practice Hub Platform Roadmap

## Phase 1: Unified Dashboard + Past Papers

Status: implemented in this architecture pass.

- Add `/dashboard` as the main signed-in app entry.
- Update navbar to Dashboard, Question Bank, Tests, Study Plan, Progress, More.
- Add Past Papers library at `/past-papers`.
- Add paper details at `/past-papers/[slug]`.
- Add Supabase schema for exam papers, modules, module questions, paper attempts, answers, and bookmarks.
- Add demo seed data using existing original question-bank questions.
- Add adaptive routing utility and unit-style checks.

## Phase 2: Mistake Review + Bookmarks

Status: planned only.

- Build `/mistakes` from missed practice/test/paper answers.
- Add question bookmark workflows across Question Bank, Practice, and Review.
- Add spaced review queue rules.
- Add AI Tutor inside mistake review.

## Phase 3: Question Rush + Vocabulary

Status: planned only.

- Add timed rapid practice at `/question-rush`.
- Add vocabulary decks at `/vocabulary`.
- Use real Supabase records for words, attempts, streaks, and mastery.
- Avoid fake leaderboards or generated stats until data exists.

## Phase 4: Score Predictor + Study Plan

Status: planned only.

- Expand current Study Plan with target-date pacing.
- Add score predictor using completed practice, tests, and paper attempts.
- Keep estimates clearly labeled as estimates, not official SAT scores.

## Phase 5: Advanced Analytics + Teacher Portal

Status: planned only.

- Add advanced analytics by domain, skill, difficulty, time, and accuracy.
- Add teacher/admin views only after role-based access controls exist.
- Add assignment workflows, cohorts, and exportable reports.
