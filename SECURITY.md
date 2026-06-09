# Security Policy

This is a public repository for a closed campaign app. The source is visible, but the project remains proprietary and contributions are accepted only through invited collaborators or maintainer-approved pull requests.

## Supported Scope

Security reports should focus on this repository, the application code, and the public production instance operated by the maintainer.

Do not test production destructively. Do not attempt data exfiltration, denial of service, credential stuffing, or access to accounts that are not yours.

## Reporting a Vulnerability

Do not open a public issue for security problems.

Report vulnerabilities privately to the maintainer through GitHub or by direct contact. Include:

- the affected area
- reproduction steps
- expected impact
- any relevant logs or screenshots with secrets removed

## Secrets

Never commit `.env` files, tokens, SSH keys, database dumps, or production credentials.

If a secret is exposed, rotate it immediately and notify the maintainer.

Before opening a pull request, run:

```bash
pnpm secrets:scan:dir
```

The CI also runs a Gitleaks history scan on pull requests.
