# Security notes (company devops)

These rules match the devops maintainer guidance for this internship environment.

## Do

- Keep SSH passwords and private keys only in **GitHub Actions secrets** or your own password manager.
- Prefer **SSH key** (`DEPLOY_SSH_KEY`) over password for Actions deploy.
- Deploy with GitHub Actions or your own terminal SSH — not through an AI agent session.

## Do not

1. **Do not connect AI agents (Cursor, Manus, Codex, etc.) directly to the company server.**  
   Agents can change remote settings without a clear review step.
2. **Do not paste server passwords into AI chats or tools.**  
   If a password was shared in chat before, change it on the host.
3. **Do not commit credentials** (passwords, private keys, `.env` with secrets) to this GitHub repo.

## In this repository

- App code has no embedded SSH passwords.
- Deploy workflow reads `DEPLOY_*` from GitHub Actions secrets only.
- Runtime history file `data/shared-history.json` is gitignored.

If you find a secret in git history, rotate it and remove it from the remote.
