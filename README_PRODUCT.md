# StudySnap product setup

StudySnap now includes a self-hostable API and real authenticated cloud accounts. The browser planner remains usable in local mode. Cloud sign-in, account sync, organization management, invitations, Google Classroom, email, and Stripe features become available when their server is configured.

## Local development

Requirements: Node.js 24 or later.

1. Copy `.env.example` to `.env` and generate `DATA_ENCRYPTION_KEY` with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.
2. Set `ADMIN_EMAIL` to an email you control before creating the administrator account.
3. In one terminal run `npm run api`.
4. In a second terminal run `npm run dev` and open the Vite URL, normally `http://localhost:5173`.
5. Register the admin at `/cloud`. Cloud data uploads use an explicit upload/download choice and server revision checks.

The development API listens on port 8787. The API only accepts browser origins listed in `ALLOWED_ORIGINS` or `APP_ORIGIN`; keep the local value at `http://localhost:5173`.

## Single-server deployment

Build and run the included container:

```sh
docker build -t studysnap .
docker run --name studysnap --env-file .env -p 8787:8787 -v studysnap-data:/data studysnap
```

Terminate TLS at a trusted reverse proxy and set `APP_ORIGIN` to the public HTTPS origin. Production startup refuses to run without HTTPS `APP_ORIGIN`, `ADMIN_EMAIL`, and `DATA_ENCRYPTION_KEY`. Keep `/data` on a persistent encrypted volume. A daily SQLite backup is written under `/data/backups` and the 14 newest daily snapshots are retained. Copy backups to an independent encrypted storage location and rehearse restore procedures before onboarding users.

CI currently runs server syntax validation and a production frontend build. It does not run automated browser, authorization, migration, or recovery tests yet.

## Optional providers

### Email

Configure `RESEND_API_KEY` and a verified `EMAIL_FROM` sender for password recovery, organization invitations, and opt-in due-date reminders. The reminder worker sends one daily email after 08:00 in the user's selected time zone. Users must enable email reminders in Accessibility & language. Without email configuration, invitation links can be copied and password reset links appear in the development server log only.

### Google Classroom

Enable the Classroom API in Google Cloud, configure the OAuth consent screen, register `/api/integrations/google/callback`, and set the client ID, secret, redirect URI, and encryption key. The app requests read-only course and coursework scopes, lists courses and coursework, and lets the learner import an assignment into their plan. Google may require OAuth app verification before a public launch. Review Google's [Classroom authorization scope guidance](https://developers.google.com/workspace/classroom/guides/auth) and [coursework list API](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWork/list) before changing requested access.

### Billing

Configure `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, and `APP_ORIGIN`. Set the webhook endpoint to `/api/billing/webhook` and subscribe it to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. Hosted checkout stays disabled until its webhook is configured. Stripe checkout and subscription portal are server-side; secret keys are never sent to the browser.

### Error reporting

`ERROR_WEBHOOK_URL` can point to a trusted error collector that accepts JSON. The API logs structured request IDs and errors to stdout and forwards fatal/unhandled runtime errors to this endpoint. Restrict access to the collector and avoid using it to capture sensitive student content.

## API and security behavior

- Accounts use salted `scrypt` password hashes, rate-limited sign-in and recovery, random opaque sessions, and HttpOnly/SameSite cookies. Cookies receive `Secure` in production.
- Cloud planner payloads and Google OAuth tokens use AES-256-GCM with `DATA_ENCRYPTION_KEY`. **Back up this key securely. Losing or rotating it without a migration makes existing encrypted data unreadable.**
- Sync uses monotonically increasing revisions. A stale upload receives HTTP 409 and never silently overwrites the newer cloud copy.
- Organizations are tenant-scoped in the database. Owner/admin checks protect invitations, role changes, retention settings, and audit history. Invitation tokens are one-use, hashed at rest, and expire after seven days.
- Organization retention currently applies to audit events. Organization planner workspaces and assigned/shared tasks are not implemented yet.
- Account deletion requires confirmation by email and removes the account and its owned organizations. It does not erase local browser copies or independent backups.
- `/healthz` is a liveness check; `/readyz` verifies database readiness. JSON logs include request IDs. A basic GitHub Actions workflow validates server syntax and builds the frontend.

## Pilot and commercial readiness

The Feedback & pilot page stores signed-in user feedback and pilot outcomes; the Admin overview is limited to accounts registered with `ADMIN_EMAIL`. These tools help gather evidence but do not replace interviews with students, tutors, and buyers.

This implementation is a **single-process, single-server pilot foundation using Node's built-in SQLite**. In the tested Node 24.12 runtime, `node:sqlite` emits an experimental warning; Node's current v24 documentation marks it release-candidate starting in v24.15. Treat it as a pilot choice, not a final enterprise data layer. Do not horizontally scale this server or place the SQLite file on shared network storage. Before a larger client rollout, migrate the data layer to managed PostgreSQL, add automated authorization and recovery tests, external backup monitoring, email verification/MFA, ownership transfer, verified-provider review, and a documented privacy/support process. Confirm education-sector obligations with qualified counsel for each target region and customer.
