# Sprint Plan & Product Backlog

**Methodology:** Scrum-style iterative development, with 2-week sprints.
**Story points:** Fibonacci (1, 2, 3, 5, 8, 13).
**Definition of Done:** the code is merged, the API has automated tests, it works in the browser at desktop and phone sizes, it's keyboard-accessible, and it's documented.

## Roles (adapt to your team)

| Role | Responsibility |
|---|---|
| Product Owner | Owns the backlog and priorities, and represents elderly users |
| Scrum Master | Runs ceremonies and removes blockers |
| Developers | Design, build and test |

---

## Sprint overview

| Sprint | Goal | Status |
|---|---|---|
| 1 | Requirements, UI/UX research, clickable prototype | ✅ Done (prototype) |
| 2 | Secure foundation: auth, encrypted vault, nominees, documents | ✅ Done |
| 3 | Legacy engine: check-ins, inactivity, release, nominee portal | ✅ Done |
| 4 | Hardening, deployment, extended features | 🔜 Planned |

---

## Sprint 1: Discovery & prototype ✅

**Goal:** understand the problem and validate the idea with a clickable prototype.

| ID | User story | Pts |
|---|---|---|
| S1-1 | Research existing digital-will services and Indian legal context | 3 |
| S1-2 | Interview / persona: elderly owner (Ramesh, 72) and nominee (Priya, 40) | 2 |
| S1-3 | Wireframes and Figma UI | 5 |
| S1-4 | Clickable front-end prototype with mock data | 8 |

**Review feedback:** the prototype looked polished but nothing worked. There was no backend, data was lost on refresh, the encryption was only a label, and the main "after death" flow was missing. The design was also not suited to elderly users (small text, icon-only controls, dense screens).

**Retrospective → actions for Sprint 2:** rebuild from scratch with a real backend, make security real, and design for accessibility first.

---

## Sprint 2: Secure foundation ✅

**Goal:** an owner can securely register and record their assets, documents and trusted people.

| ID | User story | Pts |
|---|---|---|
| S2-1 | As an owner, I can create an account and log in securely | 5 |
| S2-2 | As an owner, I'm protected from password guessing (lockout, rate limit) | 3 |
| S2-3 | As an owner, I can reset a forgotten password by email | 3 |
| S2-4 | As an owner, I can add, edit and remove assets in simple steps | 8 |
| S2-5 | As an owner, my account passwords are stored encrypted and shown only after I re-enter my password | 5 |
| S2-6 | As an owner, I can invite trusted people, who must accept by email | 5 |
| S2-7 | As an owner, I can choose who receives each asset | 3 |
| S2-8 | As an owner, I can upload documents that are encrypted on disk | 5 |
| S2-9 | As an owner, I can write personal letters to each nominee | 3 |
| S2-10 | As an elderly user, I can enlarge the text and have pages read aloud | 3 |

**Velocity:** 43 points.

---

## Sprint 3: Legacy engine & nominee portal ✅

**Goal:** the system detects inactivity and safely hands over the vault.

| ID | User story | Pts |
|---|---|---|
| S3-1 | As an owner, I choose how often to check in and how long to wait | 2 |
| S3-2 | As an owner, I'm reminded by email before my check-in is due | 3 |
| S3-3 | As an owner, I can check in with one click from the email, without a password | 3 |
| S3-4 | As the system, I move an owner through Active → Reminded → Grace → Released on an hourly schedule | 8 |
| S3-5 | As a nominee, I'm warned when the owner is not responding | 2 |
| S3-6 | As a nominee, after release I see only what was assigned to me | 5 |
| S3-7 | As a nominee, I can report a death, which starts the grace period but never releases instantly | 3 |
| S3-8 | As an owner, checking in at any time cancels a release | 2 |
| S3-9 | As an owner, I can see a full activity history | 2 |
| S3-10 | As a presenter, I can demonstrate the flow with time-travel and a dev mailbox | 3 |
| S3-11 | Home dashboard with a readiness checklist | 3 |

**Velocity:** 36 points.

---

## Sprint 4: Hardening & extensions 🔜 (planned)

| ID | User story | Pts | Priority |
|---|---|---|---|
| S4-1 | Deploy to the cloud (Render / Railway) with PostgreSQL | 5 | Must |
| S4-2 | Real email delivery through SMTP (Gmail / Brevo) | 2 | Must |
| S4-3 | Two-factor login with an email OTP | 5 | Should |
| S4-4 | SMS / WhatsApp check-in reminders | 5 | Should |
| S4-5 | Hindi language option | 5 | Should |
| S4-6 | "Executor" role who verifies a death certificate before release | 8 | Could |
| S4-7 | Printable "family summary" PDF | 3 | Could |
| S4-8 | Front-end component tests (Vitest + Testing Library) | 5 | Should |
| S4-9 | Usability test with 3 elderly participants, then fixes | 5 | Must |

---

## Burndown (example data for the report)

| Day | Sprint 2 remaining | Sprint 3 remaining |
|---|---|---|
| 0 | 43 | 36 |
| 2 | 38 | 33 |
| 4 | 30 | 27 |
| 6 | 24 | 20 |
| 8 | 15 | 12 |
| 10 | 0 | 0 |

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Leak of sensitive data | Low | Very high | Per-vault AES-256-GCM, hashed tokens, strict access checks, audit log |
| False release (owner alive) | Medium | High | Reminder + urgent email + grace period, and any check-in cancels the release |
| Owner forgets to check in | Medium | Medium | Long intervals (up to 180 days), one-click email links, login counts |
| Elderly users find the app hard | Medium | High | Accessibility-first design, step-by-step forms, plain language |
| Email not delivered | Medium | Medium | Dev mailbox in development, SMTP in production, nominees notified too |
| Scope creep | Medium | Medium | Prioritised backlog (MoSCoW) |
