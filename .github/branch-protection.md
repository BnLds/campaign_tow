# Branch Protection

Apply these settings to the default branch `main` before making the repository public.

## Main Branch Rule

Create a branch protection rule for `main` with:

- Require a pull request before merging.
- Required approvals: `1`.
- Require review from Code Owners.
- Require status checks to pass before merging.
- Require branches to be up to date before merging.
- Required status checks: the `ci` job from the `CI` workflow. GitHub may display it as `ci` or `CI / ci` depending on the settings screen.
- Restrict who can push to matching branches: `@BnLds` only.
- Do not allow force pushes.
- Do not allow deletions.

Optional but recommended:

- Do not allow bypassing the above settings.
- Require conversation resolution before merging.
- Automatically delete head branches after merge in repository settings.

## Collaborators

For invited contributors, use the lowest permission that supports the intended workflow:

- `Read` is enough for fork-based pull requests.
- `Write` allows pushing branches directly to the repository, but branch protection still prevents pushing to `main`.

Never grant `Admin` unless the contributor should be able to change repository settings, secrets, branch protection, and deployment configuration.

## Deployment

Deployment must remain triggered only by `push` to `main` in `.github/workflows/deploy.yml`.

Because `main` requires a protected pull-request merge, production deploys happen only after CI and maintainer approval.
