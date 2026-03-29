# thewestrep

Lean MVP scaffold for thewestrep using Next.js App Router, TypeScript, Tailwind CSS v4, and Vercel-friendly defaults.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- ESLint
- npm
- Auth.js / NextAuth credentials auth
- PostgreSQL (Neon) + Drizzle ORM

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment setup

Use a single local env file for both Next.js and CLI commands:

```bash
cp .env.example .env.local
```

Recommended local setup:

- Use **`.env.local` as the only local env file**.
- Do **not** keep different values split across `.env` and `.env.local`.
- If you already have a `.env`, move its values into `.env.local` and remove the duplicate file.
- The filename must be exactly `.env.local` (not `.env.local.txt`).

Required variables:

- `DATABASE_URL`: Neon pooled connection string for Vercel/Drizzle.
- `AUTH_SECRET`: random secret used by Auth.js sessions.
- `NEXTAUTH_URL`: local URL in development (`http://localhost:3000`).
- `ADMIN_USERNAME`: single admin username.
- `ADMIN_PASSWORD`: single admin password.

You can generate a secret with:

```bash
openssl rand -base64 32
```

## Database setup

1. Create a Neon Postgres database.
2. Put the pooled connection string in `DATABASE_URL` inside `.env.local`.
3. Push the schema:

```bash
npm run db:push
```

4. Optional: seed the starter catalog into Postgres:

```bash
npm run db:seed
```

### How CLI env loading works

- `npm run db:push`
- `npm run db:studio`
- `npm run db:seed`

These commands now load env files explicitly.

- If `.env.local` exists, CLI commands use it first.
- If `.env.local` does not exist, they fall back to `.env`.
- If both files exist, `.env.local` wins and the command prints a warning so the setup is not ambiguous.

If `DATABASE_URL` is missing, the public catalog falls back to the in-repo demo inventory, but admin write actions stay disabled because they require Postgres.

## Admin V1

- Private admin lives inside the same Next.js app under `/admin`.
- Auth is credentials-based with a single env-configured admin user.
- Product model supports type (`stock|encargue`), auto slug from name, brand, category, ARS price, sizes, images, state (`draft|published|paused`), WhatsApp CTA/message, and optional source URL.
- Brands and categories have full CRUD screens.
- Yupoo extraction is attempted server-side from the source URL, with manual image paste as fallback when scraping fails.

## Project structure

```text
app/                App Router entrypoints, public catalog, admin, API routes
components/         Reusable UI and feature sections
lib/                Auth, DB, catalog repository/selectors, shared helpers
public/             Static assets
scripts/            Optional utilities such as DB seeding
```

## GitHub push steps

Create the remote repo first, then run:

```bash
git add .
git commit -m "chore: scaffold initial Next.js app"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

## Vercel deploy notes

- Recommended: import the GitHub repo into Vercel once the remote exists.
- Alternative: deploy from local CLI after logging in.

```bash
npm i -g vercel
vercel
```

- Build command: `next build` (default on Vercel)
- Output setting: automatic for Next.js
- Environment variables to configure in Vercel: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`

## Yupoo caveats

- Extraction is best-effort HTML scraping only.
- Yupoo can change markup, hotlinking rules, or bot protections without warning.
- If extraction fails, keep the Yupoo source URL for reference and paste image URLs manually in the admin form.

## Next practical steps

1. Replace starter copy with brand messaging and real navigation.
2. Add design tokens, content model, and shared components.
3. Connect a future CMS/admin workflow only when the content structure is clear.
