# Security

Company devops maintainer rules for this project:

1. **Do not connect AI agents** (Cursor, Manus, Codex, etc.) **directly to the company server.**
2. **Do not paste server passwords into AI tools or chat.**
3. **Do not commit credentials** (passwords, private keys, secret `.env` files) to GitHub.

## How this repo follows that

| Topic | Practice |
|-------|----------|
| Deploy auth | GitHub Actions secrets only (`DEPLOY_*`) |
| Source tree | No SSH passwords or private keys |
| Runtime data | `data/shared-history.json` gitignored |
| Local AI/IDE | Optional; must never be used to SSH into devops |

Prefer an **SSH deploy key** (`DEPLOY_SSH_KEY`) over a password secret.

If a password was ever pasted into chat, **rotate it on the host**.
