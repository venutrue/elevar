# Create Branch and PR in GitHub Web (No CLI)

If you do not use CLI or desktop apps, use this browser-only flow.

> No terminal commands needed in this flow.

## 1) Create branch in GitHub UI

1. Open your repository on GitHub.
2. Click the branch selector (usually shows `main`).
3. Type: `feature/db-foundation-pr-ready`.
4. Click **Create branch: feature/db-foundation-pr-ready from 'main'**.

## 2) Upload / edit files in that branch

For each file (`db/*`, `docs/*`, `scripts/*`):

1. Navigate to the target folder in GitHub UI.
2. Click **Add file** → **Upload files** (or **Create new file** and paste content).
3. At the commit box, choose **Commit directly to feature/db-foundation-pr-ready**.
4. Repeat until all files are present.

## 3) Open pull request

1. Click **Compare & pull request** (or **Pull requests** → **New pull request**).
2. Base: `main`
3. Compare: `feature/db-foundation-pr-ready`
4. Click **Create pull request**.

## Why the branch wasn’t visible before

In this execution environment, no git remote is configured, so branches created here remain local-only and cannot be published to GitHub directly from this environment.
