# PR Creation Troubleshooting

If you see **"Failed to create PR"**, the issue is usually repository wiring (branch/remote/upstream), not the code diff itself.

## What was missing before

You need all three for GitHub PR creation:
1. A **feature branch** (not `main`).
2. A configured **remote** (`origin`).
3. The branch **pushed to remote** with upstream tracking.

If any one is missing, PR creation can fail.

## Quick fix (copy/paste)

```bash
# 1) Create/switch to a feature branch
./scripts/start_pr_branch.sh feature/db-foundation-pr-ready

# 2) Add remote (if not configured)
git remote add origin <your-repo-url>

# 3) Push and set upstream
git push -u origin feature/db-foundation-pr-ready

# 4) Open PR in GitHub: base=main, compare=feature/db-foundation-pr-ready
```

## Common root causes

1. **No remote configured**
   - Check: `git remote -v`
   - Fix: `git remote add origin <your-repo-url>`

2. **Branch not pushed / no upstream**
   - Check: `git rev-parse --abbrev-ref --symbolic-full-name @{u}`
   - Fix: `git push -u origin <branch-name>`

3. **Trying to open PR from `main` to `main`**
   - Fix: create and push a feature branch, then open PR to `main`.

4. **Authentication / token scope issue**
   - Fix: refresh auth; ensure token includes repo write + PR scopes.

5. **Branch protection / org policy restrictions**
   - Fix: confirm org rules permit PR creation and branch naming.

## Fast checklist

```bash
./scripts/check_pr_readiness.sh
```

## Why PR creation failed in this workspace

At diagnosis time, `git remote -v` returned no remotes, which means no upstream destination existed for creating a GitHub PR.


## Web-only (no CLI) branch creation

If you use only GitHub in browser, follow `docs/github_web_branch_and_pr.md` to create branch, upload files, and open PR entirely online.


## Configure remote quickly

Use:

```bash
./scripts/setup_remote.sh https://github.com/<OWNER>/<REPO>.git
```

Detailed guide: `docs/remote_setup_and_auth.md`.
