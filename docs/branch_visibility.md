# Branch Visibility (Local vs GitHub)

A branch created in this workspace is **local** until it is pushed to a configured remote.

## Current status in this repository

- Local branch present: `feature/db-foundation-pr-ready`
- No `origin`/remote configured in `.git/config`

Without a remote, GitHub cannot show the branch and PR creation will fail.

## Make the branch visible in GitHub

```bash
git remote add origin <your-repo-url>
git push -u origin feature/db-foundation-pr-ready
```

After push, open a PR from `feature/db-foundation-pr-ready` into `main`.
