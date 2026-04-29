---

name: workspace-bootstrap
description: >
Safe startup workflow for creating isolated Orca workspaces using Git branches
and worktrees before any coding begins.
license: Apache-2.0
metadata:
author: gentleman-programming
version: "1.0"
---

## Core Rule

One Orca workspace = one Git worktree = one branch = one focused task.

Never start coding from `main` or `master`.

---

## When to Use

Use this skill when the user says:

* new workspace
* crear workspace
* arrancar tarea
* nueva tarea
* branch nueva
* worktree
* orca workspace
* empezar feature
* empezar fix

---

## Critical Rules

1. Always start from an updated `main`.

```bash
git checkout main
git pull origin main
```

2. Never code directly on `main` or `master`.

3. Create a dedicated branch for the task.

4. Prefer `git worktree` for parallel Orca workspaces.

5. Use clear branch names.

Good:

```txt
feature/product-card-redesign
feature/hero-promo-layout
fix/mobile-navbar
refactor/yupoo-import-flow
chore/update-git-skills
```

Bad:

```txt
test
changes
new-stuff
fix
branch1
```

---

## Preflight Check

Before creating a workspace:

```bash
git status --short
git branch --show-current
git remote -v
```

If there are uncommitted changes, stop and ask whether to commit, stash, or discard them.

---

## Create Workspace With Worktree

Recommended pattern:

```bash
git checkout main
git pull origin main
git worktree add ../thewestrep-product-card -b feature/product-card-redesign
cp ../.env.local ../thewestrep-product-card/.env.local
```

Then open the new folder in Orca:

```bash
cd ../thewestrep-product-card
```

---

## Naming Convention

Workspace folder:

```txt
../thewestrep-[task-name]
```

Branch:

```txt
feature/[task-name]
fix/[task-name]
refactor/[task-name]
chore/[task-name]
```

Example:

```bash
git worktree add ../thewestrep-hero-promo -b feature/hero-promo-layout
cp ../.env.local ../thewestrep-hero-promo/.env.local
git worktree add ../thewestrep-mobile-navbar -b fix/mobile-navbar
cp ../.env.local ../thewestrep-mobile-navbar/.env.local
git worktree add ../thewestrep-yupoo-filtering -b feature/yupoo-image-filtering
cp ../.env.local ../thewestrep-yupoo-filtering/.env.local
```

---

## If Not Using Worktree

Fallback:

```bash
git checkout main
git pull origin main
git checkout -b feature/descriptive-task-name
```

Only use this if there is a single active workspace.

---

## Workspace Verification

After creating the workspace:

```bash
git branch --show-current
git status --short
pwd
test -f .env.local && echo "env OK" || echo "MISSING .env.local"
```

Expected:

```txt
branch: feature/descriptive-task-name
status: clean
folder: dedicated workspace folder
env: .env.local present
```

---

## Handoff Prompt For Agent

After workspace creation, give the coding agent a focused task:

```txt
You are working in an isolated Git worktree on branch feature/descriptive-task-name.

Rules:
- Do not switch branches.
- Do not touch main.
- Keep the scope limited to this task.
- Do not run npm run build.
- Use npm run lint and npm run typecheck for verification.
- Commit only when requested.
```

---

## Cleanup After Merge

After the PR is merged:

```bash
git checkout main
git pull origin main
git worktree list
git worktree remove ../thewestrep-task-name
git branch -d feature/descriptive-task-name
```

If the remote branch also exists:

```bash
git push origin --delete feature/descriptive-task-name
```

---

## Recovery

List worktrees:

```bash
git worktree list
```

Remove a broken worktree:

```bash
git worktree remove ../thewestrep-task-name --force
```

Prune stale references:

```bash
git worktree prune
```

Check where a branch is being used:

```bash
git worktree list
git branch -vv
```

---

## Decision Tree

| Situation                | Action                             |
| ------------------------ | ---------------------------------- |
| User wants a new task    | Create new branch + worktree       |
| User is on `main`        | Stop and create feature branch     |
| Existing changes in repo | Ask commit/stash/discard           |
| Multiple active tasks    | Use worktrees                      |
| Single simple task       | Branch-only workflow is acceptable |
| Task is experimental     | Use `experiment/task-name` branch  |
| Task is urgent bug       | Use `fix/task-name` branch         |
