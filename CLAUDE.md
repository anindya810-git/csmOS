# Claude Code Instructions

## Git Push Rules

After every commit, always push to **both** the feature branch and `main`:

```bash
git push -u origin claude/fervent-cannon-3u4b2z
git push origin claude/fervent-cannon-3u4b2z:main
```

Never leave `main` behind the feature branch.
