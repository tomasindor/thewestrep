---
name: git-delivery
description: >
  Safe commit, push, and pull request workflow for TheWestRep using gga review gates.
  Trigger: committing changes, pushing branches, creating pull requests, or preparing work for review.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- Before creating a commit.
- Before pushing a branch to `origin`.
- Before opening or updating a pull request.
- When the user says: commit, push, PR, pull request, subir cambios, crear PR, merge request, or release branch.

## Critical Patterns

1. **Verify before agreeing**: inspect `git status`, `git diff`, and recent `git log` before saying what will be committed.
2. **Never commit secrets**: stop and warn if staged/untracked files look like `.env`, credentials, keys, tokens, dumps, or private config.
3. **Use conventional commits only**: no `Co-Authored-By` trailers and no AI attribution.
4. **Do not build**: this repo explicitly forbids running builds during agent workflows. Use lint/typecheck/tests instead.
5. **Use `gga` as the review gate**: run `gga run` on staged changes before committing; run `gga run --pr-mode --diff-only` before creating a PR when branch-level review is needed.
6. **Do not force-push unless the user explicitly asks**; never force-push `main`/`master`.
7. **Use `gh` for GitHub operations**: PR creation, labels, checks, and issue lookup go through `gh`.
8. **Respect this repo stack**: Next.js 16.2.1, React 19, TypeScript strict mode, native `node:test`, Playwright. If code changes are needed, read relevant `node_modules/next/dist/docs/` docs first.

## Repo-Specific Facts

| Area | Value |
|------|-------|
| Remote | `origin` -> `https://github.com/tomasindor/thewestrep.git` |
| Working branch in this workspace | `login` |
| Package manager | npm (`package-lock.json`) |
| Lint command | `npm run lint` |
| Typecheck command | `npm run typecheck` |
| Unit tests | `npm run test:unit` |
| E2E tests | `npm run e2e` when user explicitly asks or PR scope requires it |
| Forbidden routine check | `npm run build` |
| gga provider | Global config currently uses `opencode` |
| gga rules file | `AGENTS.md` |

## Commit Workflow

### 1. Inspect repository state

```bash
git status --short
git diff --stat
git diff
git diff --staged
git log --oneline -5
```

Decide whether all changes belong in one commit. If unrelated changes are mixed, ask the user how to split them.

### 2. Choose verification commands

Use the smallest meaningful verification set:

| Change type | Commands |
|-------------|----------|
| TypeScript/server/client code | `npm run lint` + `npm run typecheck` + targeted/unit tests when available |
| Tests only | `npm run test:unit` or the targeted test command |
| Playwright/E2E behavior | `npm run e2e` only when scope requires it or user asks |
| Docs/markdown only | No npm verification required; inspect diff carefully |
| Scripts/data import logic | `npm run lint` + `npm run typecheck` + relevant script dry-run only if safe |

Do **not** run `npm run build`.

### 3. Stage intentionally

```bash
git add <specific-files>
git status --short
git diff --staged
```

Avoid `git add .` unless the diff was reviewed and every file is intentional.

### 4. Run gga on staged files

```bash
gga run
```

If `gga` reports issues:

1. Fix real issues.
2. Re-stage changed files.
3. Re-run `gga run`.
4. Only proceed when the review passes or the user explicitly accepts a known false positive.

### 5. Commit

Use a message that explains intent, not mechanics.

```bash
git commit -m "type(scope): concise reason"
```

Allowed types:

```text
build, chore, ci, docs, feat, fix, perf, refactor, revert, style, test
```

Examples:

```bash
git commit -m "fix(auth): preserve callback redirect after login"
git commit -m "test(catalog): cover image fallback selection"
git commit -m "docs(workflow): add gga delivery process"
```

## Push Workflow

Before pushing:

```bash
git status --short
git branch --show-current
git remote -v
git log --oneline --decorate -5
```

Rules:

- Push feature branches with upstream tracking: `git push -u origin <branch>`.
- If upstream already exists: `git push`.
- Never push directly to `main`/`master` unless the user explicitly asks and you warn about the risk.
- Never use `--force` or `--force-with-lease` unless explicitly requested.

## Pull Request Workflow

### 1. Review the full PR diff with gga

```bash
gga run --pr-mode --diff-only
```

Use plain `gga run --pr-mode` if the PR is small and full-file context is more valuable than speed.

### 2. Push the branch

```bash
git push -u origin <branch>
```

### 3. Create PR with `gh`

Use a HEREDOC body. Start from [assets/pr-body-template.md](assets/pr-body-template.md).

```bash
gh pr create --title "type(scope): concise reason" --body "$(cat <<'EOF'
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

If this repository later adds PR templates, issue linkage, or required labels, follow those stricter rules.

### 4. Check PR state

```bash
gh pr view --web
gh pr checks
```

Report the PR URL and any failing checks.

## Decision Tree

| Situation | Action |
|----------|--------|
| User asks “commit this” | Inspect status/diff/log, stage intentional files, run relevant verification, run `gga run`, commit. |
| User asks “push” | Verify branch/remotes/status, ensure no uncommitted intended work, push safely. |
| User asks “create PR” | Review branch diff, run `gga run --pr-mode --diff-only`, push if needed, create PR via `gh`. |
| gga fails | Fix, re-stage, re-run. If ambiguous, ask user. |
| Secrets detected | Stop. Do not stage/commit/push. Warn user. |
| Mixed unrelated changes | Ask user whether to split commits. |
| User requests force push | Confirm target branch and warn. Never force-push `main`/`master`. |

## Commands

```bash
# gga setup/inspection
gga config
gga install
gga install --commit-msg
gga run
gga run --no-cache
gga run --pr-mode --diff-only

# safe commit prep
git status --short
git diff
git diff --staged
git log --oneline -5

# repo verification, never build
npm run lint
npm run typecheck
npm run test:unit

# PRs
git push -u origin <branch>
gh pr create --title "type(scope): concise reason" --body "$(cat <<'EOF'
## Summary
-

## Verification
- [x] gga run --pr-mode --diff-only

## Risk
-
EOF
)"
gh pr checks
```

## Resources

- **PR body template**: [assets/pr-body-template.md](assets/pr-body-template.md)
