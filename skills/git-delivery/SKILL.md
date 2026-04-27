---

name: git-delivery
description: >
Safe Git workflow for TheWestRep using Orca workspaces, isolated branches,
gga review gates, and PR-based delivery.
license: Apache-2.0
metadata:
author: gentleman-programming
version: "2.0"
---

## Core Rule

One workspace = one branch = one task.

Never work directly on `main` or `master`.

---

## When to Use

Use this skill when the user says:

* commit
* push
* PR
* pull request
* merge
* branch
* workspace
* subir cambios
* crear PR
* unir a main

---

## Critical Rules

1. Always inspect Git state before acting:

```bash
git status --short
git branch --show-current
git diff --stat
git diff
git log --oneline --decorate -5
```

2. If current branch is `main` or `master`, stop and create a feature branch.

```bash
git checkout -b feature/descriptive-name
```

3. Never commit directly to `main` or `master`.

4. Each Orca workspace must use its own dedicated branch.

Bad:

```txt
workspace-a → main
workspace-b → main
workspace-c → main
```

Good:

```txt
workspace-a → feature/product-card
workspace-b → feature/hero-redesign
workspace-c → fix/mobile-navbar
```

5. Never reuse the same branch across multiple active workspaces.

6. Never commit secrets:

Stop if files look like:

```txt
.env
.env.local
*.pem
*.key
credentials
tokens
database dumps
private config
```

7. Stage files intentionally.

Prefer:

```bash
git add app/products/ProductCard.tsx
git add components/Hero.tsx
```

Avoid:

```bash
git add .
```

Only use `git add .` if the full diff was reviewed.

8. Do not run builds.

Forbidden:

```bash
npm run build
```

Allowed:

```bash
npm run lint
npm run typecheck
npm run test:unit
```

9. Run `gga` before committing.

```bash
gga run
```

10. Before PR, review branch diff with:

```bash
gga run --pr-mode --diff-only
```

11. Never force-push unless the user explicitly asks.

Never force-push `main` or `master`.

---

## Workspace Start Workflow

When starting a new Orca workspace:

```bash
git checkout main
git pull origin main
git status --short
git checkout -b feature/descriptive-task-name
```

Branch naming:

```txt
feature/product-card-redesign
feature/hero-promo-layout
feature/yupoo-image-filtering
fix/mobile-navbar
fix/login-callback
refactor/scraper-import-flow
chore/update-git-workflow
```

---

## Commit Workflow

### 1. Inspect

```bash
git status --short
git branch --show-current
git diff --stat
git diff
git diff --staged
git log --oneline --decorate -5
```

If branch is `main` or `master`, stop.

### 2. Check for unrelated changes

If changes are mixed, split them into separate commits or ask the user.

Example:

```txt
Commit 1: fix product card spacing
Commit 2: refactor scraper image filtering
```

### 3. Verify

Choose based on change type:

| Change type           | Commands                                  |
| --------------------- | ----------------------------------------- |
| UI / TS / React       | `npm run lint` + `npm run typecheck`      |
| Server / DB / scripts | `npm run lint` + `npm run typecheck`      |
| Unit tests touched    | `npm run test:unit`                       |
| Docs only             | no npm command required                   |
| E2E behavior          | `npm run e2e` only if needed or requested |

Never run:

```bash
npm run build
```

### 4. Stage intentionally

```bash
git add <specific-files>
git status --short
git diff --staged
```

### 5. Run review gate

```bash
gga run
```

If `gga` fails:

1. Fix real issues.
2. Re-stage.
3. Re-run `gga run`.
4. Continue only when clean.

### 6. Commit

Use conventional commits:

```bash
git commit -m "feat(products): improve streetwear product card"
git commit -m "fix(hero): correct mobile carousel spacing"
git commit -m "refactor(scraper): isolate yupoo image filtering"
```

Allowed types:

```txt
feat, fix, refactor, chore, docs, style, test, perf, build, ci, revert
```

No AI attribution.
No `Co-Authored-By`.

---

## Push Workflow

Before pushing:

```bash
git status --short
git branch --show-current
git remote -v
git log --oneline --decorate -5
```

If first push:

```bash
git push -u origin <branch>
```

If upstream already exists:

```bash
git push
```

Never push directly to `main` unless the user explicitly asks and confirms the risk.

---

## PR Workflow

### 1. Update against main

```bash
git fetch origin
git rebase origin/main
```

If conflicts appear, resolve them in the feature branch.

### 2. Run branch review

```bash
gga run --pr-mode --diff-only
```

### 3. Push

```bash
git push -u origin <branch>
```

If branch already exists:

```bash
git push
```

### 4. Create PR

```bash
gh pr create --title "feat(scope): concise reason" --body "$(cat <<'EOF'
## Summary
-

## Verification
- [x] gga run --pr-mode --diff-only
- [x] npm run lint
- [x] npm run typecheck

## Risk
-
EOF
)"
```

### 5. Check PR

```bash
gh pr checks
```

---

## Merge Safety Rule

Before merging to `main`:

```bash
git checkout main
git pull origin main
git merge --no-ff <branch>
npm run lint
npm run typecheck
git push origin main
```

Prefer GitHub PR merge instead of local merge.

---

## Recovery Commands

Abort rebase:

```bash
git rebase --abort
```

Abort merge:

```bash
git merge --abort
```

Check changed files against main:

```bash
git diff --name-only main...HEAD
```

See full branch diff:

```bash
git diff main...HEAD
```

Delete local branch after merge:

```bash
git branch -d <branch>
```

Delete remote branch after merge:

```bash
git push origin --delete <branch>
```
