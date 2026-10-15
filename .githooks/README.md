# Git hooks

Branch flow: `feature/*` → `development` → `uat` → `main`.

- **pre-commit** blocks direct commits on `development`, `uat` and `main`.
- **reference-transaction** guards every move of those three branches, including fast-forwards, resets, `--amend` and `git branch -f`. They only move by a merge commit from the branch below. Pulling the same branch from `origin` is allowed.
- **pre-merge-commit** checks what's being merged:
  - `development` takes feature branches only
  - `uat` takes only `development`
  - `main` takes only `uat`

Turn them on once per clone:

```sh
git config core.hooksPath .githooks
git config branch.development.mergeoptions --no-ff
git config branch.uat.mergeoptions --no-ff
git config branch.main.mergeoptions --no-ff
```

`--no-ff` makes plain `git merge` create the merge commit the hooks expect; without it a fast-forward would be refused.
These are local guards. Branch protection on GitHub is what enforces the rule for everyone.
