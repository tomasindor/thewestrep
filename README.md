# thewestrep

Lean MVP scaffold for thewestrep using Next.js App Router, TypeScript, Tailwind CSS v4, and Vercel-friendly defaults.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- ESLint
- npm

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```text
app/                App Router entrypoints, layout, global styles
components/         Reusable UI and feature sections
lib/                Shared config and future helpers
public/             Static assets
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
- Environment variables: add later if a CMS, admin panel, or third-party APIs are introduced

## Next practical steps

1. Replace starter copy with brand messaging and real navigation.
2. Add design tokens, content model, and shared components.
3. Connect a future CMS/admin workflow only when the content structure is clear.
