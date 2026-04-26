<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Skills

| Skill | Purpose | Auto-load Trigger |
|-------|---------|-------------------|
| `git-delivery` | Safe commit, push, and PR workflow using `gga` as the review gate | Committing, pushing, creating PRs, or preparing changes for review |

## Git Delivery Rules

- Load `skills/git-delivery/SKILL.md` before commits, pushes, or pull requests.
- Use `gga run` before committing staged changes.
- Use `gga run --pr-mode --diff-only` before opening PRs.
- Use conventional commits only; never add AI attribution or `Co-Authored-By` trailers.
- Do not run builds as part of routine verification.
