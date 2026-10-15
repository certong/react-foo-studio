# Git hooks

Branch flow: `feature/*` → `development` → `uat` → `main`.

- **pre-commit** blocks direct commits on `development`, `uat` and `main`.
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

`--no-ff` matters: a fast-forward merge creates no merge commit, so the hooks would never run.
These are local guards. Branch protection on GitHub is what enforces the rule for everyone.
