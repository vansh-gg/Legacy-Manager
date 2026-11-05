# Digital Legacy Manager

A secure, elderly-friendly **digital will**. Owners record their bank accounts, online accounts,
insurance, property papers and personal messages; choose trusted family members (**nominees**);
and the system releases each item to the right person **only if the owner stops checking in**.

> Software Engineering & Project Management (SEPM) project.

---

## Why

When someone passes away, families often spend months finding bank details, policies, passwords and
property papers. Existing solutions are either paper-based (easily lost) or built for tech-savvy users.
This project is designed from the ground up for **older users** and their families.

## Features

| Area | What it does |
|---|---|
| **Secure vault** | Store accounts and assets in 8 categories, with encrypted usernames, passwords and notes |
| **Documents** | Upload wills, property papers, policies and ID proofs. Files are encrypted on disk |
| **Trusted people** | Invite nominees by email. They must accept with their own account |
| **Assignment** | Decide exactly which nominee receives each asset and document, with written wishes |
| **Personal letters** | Encrypted letters delivered to one nominee after release |
| **Proof of life** | Regular check-ins (7–180 days). Logging in or one email click counts |
| **Inactivity engine** | Reminder → urgent warning + nominee heads-up → grace period → release |
| **Nominee portal** | After release, nominees see only what was assigned to them |
| **Safe reporting** | A nominee can report a death. This starts the grace period, but **never** releases anything immediately |
| **Activity history** | Full audit log, highlighting failed logins and nominee access |
| **Accessibility** | Large readable font, 3 text sizes, read-aloud, AAA contrast, 56px buttons, step-by-step forms |

## Security highlights

- **AES-256-GCM** authenticated encryption with a **separate key per vault** (HKDF-SHA256)
- **bcrypt** password hashing (cost 12), account lockout after 5 wrong passwords
- **HttpOnly, SameSite** session cookies plus a CSRF header check. Sessions are revoked on password change
- Password re-entry is required to view any secret, and every view is logged
- Single-use, hashed, expiring email tokens (invite, reset, check-in)
- Helmet security headers and strict CSP, rate limiting, Zod input validation, magic-byte file-type checks
- Strict ownership checks: another user's records always return 404

See [docs/SECURITY.md](docs/SECURITY.md) for the threat model.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, React Router 7, Tailwind CSS 4, Vite, Lucide icons |
| Backend | Node.js, Express 5, Prisma ORM, Zod, node-cron, Nodemailer |
| Database | SQLite (development), switchable to PostgreSQL |
| Testing | Node test runner + Supertest (35 API test cases) |

## Getting started

Requires **Node.js 20.12+**.

```bash
npm install        # installs server + client
npm run setup      # creates server/.env with random secrets and the database
npm run seed       # optional: demo family data
npm run dev        # API on :4000, web app on http://localhost:5173
```

### Demo accounts (after `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Owner (Ramesh Kumar, 72) | `ramesh@example.com` | `Demo@1234` |
| Nominee (his daughter Priya) | `priya@example.com` | `Demo@1234` |

### Demonstrating the release flow (no need to wait 30 days)

In development, **Settings → Demonstration tools** can move time forward for your own account:

1. Log in as Ramesh, then go to **Settings** and press **Miss the check-in**. The status becomes *Grace*: a red banner appears and emails go out.
2. Press **End the waiting period**. The vault is now *Released*.
3. Open **Demo mailbox** to read every email the system sent.
4. Log out, log in as Priya, and open **Left for me**. You'll see the letter, accounts and will.
5. Log back in as Ramesh. The release is cancelled and access is locked again.

### Tests

```bash
npm test
```

## Project structure

```
client/                React app
  src/components/      design system (buttons, fields, dialogs, layout)
  src/pages/           screens (auth, home, assets, nominees, documents, letters, shared…)
server/
  prisma/              schema, migrations, demo seed
  src/routes/          REST API modules
  src/services/        check-in state machine, vault helpers
  src/lib/             encryption, storage, mailer, tokens, audit log
  tests/               API test suites
docs/                  SEPM documentation
```

## Documentation

- [Sprint plan & product backlog](docs/SPRINT_PLAN.md)
- [Software Requirements Specification](docs/SRS.md)
- [Architecture & UML diagrams](docs/ARCHITECTURE.md)
- [Test cases](docs/TEST_CASES.md)
- [Security design](docs/SECURITY.md)
- [Deployment](docs/DEPLOYMENT.md)

## Disclaimer

This is an academic project. It is not a legal will, and it does not replace one registered under the
Indian Succession Act. Users should keep a legal will and can store a copy of it here.
