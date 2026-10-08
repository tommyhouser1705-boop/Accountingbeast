# Connected classroom setup

The static website remains on GitHub Pages; Supabase hosts authentication, the database, and the `classroom` Edge Function. Browser configuration contains only a project URL and publishable key. All mutations and grading run in the authenticated Edge Function. No secret is committed.

## GitHub setup action

The manual workflow `.github/workflows/deploy-classroom.yml` installs the database if missing, preserves existing complete databases, approves the owner email entered in the run form, sets APP_ORIGIN, deploys `classroom`, and checks CORS/authentication readiness. Add a Supabase personal management token privately as the repository Actions secret `SUPABASE_ACCESS_TOKEN`; run **Set up Ledger Lane accounts** on main with your owner email. The token is used by the runner, never committed or printed. No database password is needed. A partial schema stops setup instead of replacing data. The workflow also starts automatically for backend/deployment changes pushed to main. Automatic runs locate the designated existing owner by an email fingerprint; they never select an arbitrary registered user. The owner email can still be supplied through the manual form. Linking GitHub in Supabase does not supply the deployment token.

## Dashboard setup (no CLI required)

Use the published `account-setup.html` guide. It generates the migration plus an owner email seed and provides a single-file server (`docs/classroom-function.ts`). Run the SQL once in a new project. Create/deploy `classroom` from the dashboard editor; disable platform Verify JWT because the function verifies tokens with Auth `getUser()` itself. Set Edge Function secret `APP_ORIGIN=https://tommyhouser1705-boop.github.io` (origin only). Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the function automatically.

Set Authentication Site URL and allowed Redirect URL to `https://tommyhouser1705-boop.github.io/Accountingbeast/`. Enable email confirmations and minimum 12-character passwords. Configure custom SMTP for multiple pilot testers; Supabase's built-in email provider has delivery/recipient/rate limits. Never share the database password, personal access token, or service-role key.

Put the project URL and public publishable key in `cloud-config.js`, then `npm run build` and publish `docs/`. The project URL and public key are now configured for `eaahwjgdpmvaasgtjpaq`. The migration, owner seed, and function still require deployment in that project. Live connectivity has not been verified from this environment; use the guide’s browser connection check.

## CLI alternative

With the Supabase CLI installed and logged into the project:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase secrets set APP_ORIGIN=https://tommyhouser1705-boop.github.io
supabase functions deploy classroom --no-verify-jwt
```

Seed the first owner's lowercase email in the SQL editor after migration:

```sql
insert into public.demo_access(email,role) values ('YOUR_EMAIL_HERE','owner');
```

The owner then uses Create invited account, confirms email, and signs in. Approvals are database records; signup metadata can never grant a role. Professors authorize specific student emails for their own classes. Authorization does not send email; share the site link separately. The owner can disable/restore users. Professors can remove students from individual classes but cannot restore globally disabled access. Existing account roles cannot be changed through the app; use separate test emails for separate roles.

## Storage and grading

RLS is enabled with no browser read/write policies. Anonymous and authenticated database access is revoked; only the server's service role can use the tables and commit RPC. The function rechecks approved role and class access on every request. Students can read only their own submissions. Professors can inspect only their own classes; the owner can inspect every class.

Each business decision creates a server scenario from the stored assignment. Browser-supplied answers, scores, first attempts, and completion flags are ignored. Every submission appends timestamped history. Immutable first-assessment scores survive corrections. Atomic revision checks prevent stale tabs overwriting work; refresh before retrying a conflict. Browser drafts are not autosaved; profile saves, confirmed business decisions, and submitted entries/predictions/effects are cloud saved. Sessions use sessionStorage, refresh tokens, and explicit sign out; signing in on another device restores server work. The legacy capstone stays separate local practice and is not part of cloud grading.

The pilot uses synchronous lists capped at 1,000 records per query. Keep pilot classes small; pagination, rate limits beyond Supabase Auth, formal retention policies, institutional compliance review, and a production-grade support/backup process need additional work before broad institutional use. This protects recorded grading from client edits; it is not an exam anti-cheating system. Expected template logic is also used for student practice in the browser. Assignment generation remains four tested templates, not AI.

## Validation

`npm test` covers accounting, authorization, submission validation, first-attempt preservation, conflicts, and client refresh/session behavior. Browser tests exercise the account/classroom UI against a mocked authenticated API using the actual server service logic. Migration/permission/atomic commit behavior was checked using PostgreSQL in PGlite. These checks do not establish that an actual Supabase project is deployed; after setup, test owner + professor + student using separate browser sessions, verify another-device restoration, and check disabled access against the hosted function.
