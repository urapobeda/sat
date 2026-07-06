# SAT Practice Hub

SAT Practice Hub is a premium EdTech/SaaS-style SAT preparation MVP built with Next.js, React, TypeScript, Tailwind CSS, lucide-react, and Supabase.

The app includes a Supabase-backed question bank, interactive practice sessions, timed mini tests, auth, saved progress, weak-area analytics, and a responsive dashboard UI.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- lucide-react icons
- Supabase Auth, Postgres, and Row Level Security

## Getting Started

Install dependencies:

```bash
npm install
```

Create local environment variables:

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Run the development server:

```bash
npm run dev
```

Open the site locally:

```bash
http://127.0.0.1:3000
```

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run `supabase/schema.sql`.
4. Run `supabase/seed.sql`.
5. In Authentication settings, enable Email/Password sign-in.
6. Use only the public anon key in `.env.local`. Do not put a service role key in the frontend.

If the schema was already created before the grants were added, run
`supabase/fix-permissions.sql` once. This fixes errors like
`permission denied for table questions` for the public question bank.

## Database Tables

- `profiles`
- `questions`
- `practice_sessions`
- `practice_answers`
- `test_sessions`
- `test_answers`

RLS is enabled on all tables. Questions are readable by anonymous and authenticated users, while profiles, sessions, and answers are owner-only through `auth.uid()`.

## Current Features

- Responsive landing page for SAT preparation
- Question Bank powered by Supabase questions
- Search and section filtering for topics/questions
- Practice flow from `/question-bank/practice`
- Immediate feedback and explanations in practice mode
- Timed 15-minute mini test from `/tests/start`
- Test results review with selected answers, correct answers, and explanations
- Supabase Auth page at `/auth`
- Progress dashboard from Supabase session history
- Weak-area analytics from missed practice/test answers
- Clear Progress action for authenticated users
- Guest mode with clear sign-in notes

## Working Routes

- `/`
- `/auth`
- `/question-bank`
- `/question-bank/practice`
- `/tests`
- `/tests/start`
- `/progress`
- `/converter`

## Checks

Run lint:

```bash
npm run lint
```

Build for production:

```bash
npm run build
```

## Future Ideas

- Add full-length SAT sections with separate timing
- Add review flags and skipped-question review
- Add adaptive recommendations by weak topic
- Add per-question attempt history
- Add server-side Supabase reads for faster initial dashboards
- Add account settings and profile preferences
