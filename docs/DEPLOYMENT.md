# Deployment

The Express server also serves the built React app, so the whole system deploys as **one web service**.

## Render (free tier)

1. Push this repository to GitHub.
2. Create a **PostgreSQL** database on Render (or Neon / Supabase).
3. In `server/prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`. Delete `server/prisma/migrations`, then run `npx prisma migrate dev --name init` against the Postgres URL and commit the new migration.
4. Create a **Web Service** from the repo:
   - **Build command:** `npm install && npm run build && npm run db:deploy -w server`
   - **Start command:** `npm start`
5. Set these environment variables:

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Postgres connection string |
| `JWT_SECRET` | 48+ random characters |
| `ENCRYPTION_KEY` | 32 random bytes, base64 |
| `CLIENT_URL` | Your Render URL, e.g. `https://dlm.onrender.com` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM` | Your email provider (e.g. Brevo or a Gmail app password) |
| `ENABLE_DEV_TOOLS` | `true` only for a classroom demo deployment, otherwise leave unset |

> Uploaded documents are stored on the server's disk. On free hosts the disk is temporary, so use a
> paid persistent disk, or move storage to S3-compatible object storage (future work).

Generate the secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
