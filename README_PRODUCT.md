# Studypath · SDE Learning Workspace

Studypath is a personal learning workspace for an early-career software engineer. It combines an editable SDE roadmap, a dated learning journal, focused study timer, progress reports, and private file attachments.

## Local setup

1. Install the project dependencies with `npm install`.
2. Create a `.env.local` file in the project root using the Supabase **Project URL** and **publishable key** from your project settings:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
   ```

   `.env.local` is ignored by Git. Do not put a `service_role` or secret key in a `VITE_` variable; browser code is public.

3. In your Supabase project's SQL Editor, run [`supabase/migrations/202610220001_sde_learning_journey.sql`](supabase/migrations/202610220001_sde_learning_journey.sql). It creates the profile, roadmap and learning entry tables; user ownership rules; a private attachment bucket; and the starter SDE roadmap applied to each new account.
4. Enable email/password sign-in in Supabase Auth. For local development, add `http://localhost:5173` to the allowed redirect URLs. If email confirmation is enabled, new learners confirm the email before signing in.
5. Run `npm run dev`, then open the local URL shown in the terminal. Production assets can be generated with `npm run build`.

## What is stored

- **Roadmap:** personal phases, topics and subtopics, descriptions, target/status fields and completion state. Add and remove phases or topics; update topic status as you progress.
- **Learning journal:** session date and start time, duration, phase/topic, notes, resource URL and optional attachment.
- **Study timer:** focused elapsed time can be saved into the journal.
- **Reports:** time by date and learning phase, weekly goal, session totals and roadmap completion.
- **Profile and export:** target role, weekly hours goal and a JSON backup of the profile, roadmap and learning entries.

Each account's records are protected by PostgreSQL row-level security. The `learning-files` bucket is private; uploads are limited to 25 MB and access is scoped to the signed-in learner. The browser uses only the Supabase publishable key, with database policies enforcing user access.

## Current integration state

Project credentials are intentionally placeholders in `.env.example`. Add your own URL and publishable key to `.env.local`, then apply the SQL migration before creating an account. Without those two steps, the app displays its connection instructions rather than demo data.

The older StudySnap server files remain in the repository for reference; this learning workspace uses Supabase directly and does not require the legacy SQLite service.
