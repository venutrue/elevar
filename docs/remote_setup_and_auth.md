# Configure Git Remote + Auth (to publish branch to GitHub)

Use this once per local repository so branches can be pushed and PRs can be created in GitHub.

## Where to run these commands

Run shell commands in a **terminal**, not in Notepad.

You can use any of these terminals:
- VS Code integrated terminal
- macOS Terminal / iTerm
- Windows PowerShell / Git Bash
- Linux terminal
- GitHub Codespaces terminal

If you do not want to use any terminal at all, use the browser-only guide: `docs/github_web_branch_and_pr.md`.

## 1) Add GitHub remote

```bash
git remote add origin https://github.com/<OWNER>/<REPO>.git
```

If `origin` already exists and is wrong:

```bash
git remote set-url origin https://github.com/<OWNER>/<REPO>.git
```

Verify:

```bash
git remote -v
```

## 2) Authenticate

Choose one method.

### Option A: HTTPS + Personal Access Token (recommended)

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens**.
2. Create token with repo permissions (Contents: Read/Write, Pull Requests: Read/Write).
3. Push once; when prompted:
   - Username: your GitHub username
   - Password: the PAT token

### Option B: SSH key

```bash
ssh-keygen -t ed25519 -C "you@example.com"
cat ~/.ssh/id_ed25519.pub
```

Add public key in GitHub → **Settings** → **SSH and GPG keys**.
Then set remote to SSH:

```bash
git remote set-url origin git@github.com:<OWNER>/<REPO>.git
```

Test:

```bash
ssh -T git@github.com
```

## 3) Push branch and set upstream

```bash
git push -u origin <branch-name>
```

After this, GitHub UI will show the branch and offer **Create pull request**.

## 4) Quick diagnostics

```bash
./scripts/check_pr_readiness.sh
```

If it still fails, inspect:

```bash
git remote -v
git rev-parse --abbrev-ref --symbolic-full-name @{u}
```
