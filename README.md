# Mini Notes

A tiny practice app: sign in with GitHub, write private notes, and get a note automatically every time you push to a GitHub repo.

Live: https://mini-notes-sigma.vercel.app

## How it fits together

```
Browser ──► Next.js on Vercel (web/) ──► Supabase (Postgres + Auth + RLS)
                                              ▲
GitHub push ──webhook──► Express on Render (worker/) ──┘
```

- **web/**: Next.js + TypeScript. GitHub login through Supabase Auth, one page to add and list your notes.
- **worker/**: one Express file with `POST /webhook`. It verifies GitHub's signature and inserts "New push to <repo>".
- **supabase/schema.sql**: the `notes` table and its Row Level Security policies.

## Environment variables

| Where | Variable | Secret? |
|---|---|---|
| Vercel + `web/.env.local` | `NEXT_PUBLIC_SUPABASE_URL` | No |
| Vercel + `web/.env.local` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | No (public, protected by RLS) |
| Vercel + `web/.env.local` | `SITE_URL` | No |
| Render only | `SUPABASE_URL` | No |
| Render only | `SUPABASE_SERVICE_ROLE_KEY` | **Yes**, bypasses RLS |
| Render + GitHub webhook | `GITHUB_WEBHOOK_SECRET` | **Yes** |
| Render only | `NOTES_USER_ID` | No |

## Run locally

```bash
# Web app
cd web
cp .env.example .env.local   # fill in the values
npm install
npm run dev                  # http://localhost:3000

# Worker (optional locally)
cd worker
npm install
npm start                    # needs the Render env vars set in your shell
```

## Security checks

- GitHub **CodeQL**, **Dependabot**, and **secret scanning with push protection** are enabled.
- **Snyk** scans both `package.json` files and the source code.
- First results: 0 issues, except one Snyk Code "Improper Type Validation" (Low) in the worker, fixed by type-checking the webhook body and payload.

## The six security rules (in my own words)

<!-- Answer each in 1-2 sentences. The question under each heading is a hint; delete it when you're done. -->

### 1. Row Level Security (OWASP A01)
_Why is RLS needed if the anon/publishable key is public anyway? What does `auth.uid()` do in the policies?_

### 2. Secrets
_Why must the service role (secret) key never be in `web/` or have a `NEXT_PUBLIC_` prefix? Where does it live?_

### 3. JWT and sessions (OWASP A07)
_What's inside the Supabase JWT, and why do the signature and expiry matter? Why read the user on the server?_

### 4. OAuth redirect URLs (OWASP A05)
_Why must the redirect URL be an exact allowlisted URL instead of a wildcard? What were the two "hops" we configured?_

### 5. Webhook signatures (OWASP A08)
_Why verify `X-Hub-Signature-256`, why on the raw body, and why a timing-safe compare?_

### 6. Input validation (OWASP A03)
_Why validate note length on the server, not just with `maxLength` in the browser? Why use the Supabase client instead of building SQL strings?_
