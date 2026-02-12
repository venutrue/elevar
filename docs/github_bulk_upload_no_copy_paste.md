# No Copy/Paste Flow (GitHub Web Only)

You do **not** need to paste files one-by-one.

## Fastest workflow

1. Create branch in GitHub UI: `feature/db-foundation-pr-ready`.
2. In this workspace, run `./scripts/package_web_upload.sh` to generate `artifacts/github-web-upload.zip`.
3. Extract the zip on your computer.
4. In GitHub UI on that branch, click **Add file → Upload files**.
5. Drag/drop the extracted `db/`, `docs/`, and `scripts/` folders **all at once** into the upload area.
6. Commit once to `feature/db-foundation-pr-ready`.
7. Open PR to `main`.

## Why this is better

- One upload action for all files.
- One commit.
- No manual copy/paste of file contents.
