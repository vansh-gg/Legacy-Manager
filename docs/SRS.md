# Software Requirements Specification

## 1. Introduction

### 1.1 Purpose
Digital Legacy Manager (DLM) lets a person, especially an elderly person, securely record their
digital and physical assets and pass them to chosen people after death or long incapacity.

### 1.2 Scope
DLM is a web application (desktop and mobile browsers) with:
- an owner-facing vault
- a nominee-facing portal
- an automated proof-of-life engine

It is **not** a legal will.

### 1.3 Definitions
| Term | Meaning |
|---|---|
| Owner | A registered user who records items in their vault |
| Nominee / trusted person | A person chosen by an owner to receive items |
| Asset | A record of an account or possession (bank, email, insurance, property…) |
| Check-in | The owner confirming they are alive and well |
| Grace period | Days of waiting after a missed check-in before release |
| Release | Making assigned items visible to accepted nominees |

## 2. Overall description

### 2.1 User classes
| User | Characteristics |
|---|---|
| Elderly owner | Aged 60+, low-to-moderate digital literacy, may have reduced vision |
| Nominee | Adult family member, average digital literacy, likely to use the app at a stressful time |

### 2.2 Operating environment
Modern browsers (Chrome, Edge, Firefox, Safari) on Windows, macOS, Android and iOS. Node.js 20+ server.

### 2.3 Constraints
- Sensitive data must be encrypted at rest.
- Usable at 200% zoom and with a keyboard only.

## 3. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | The system shall let a user register with a name, email and password (min 8 characters, a letter and a number) | Must |
| FR-2 | The system shall lock an account for 15 minutes after 5 consecutive wrong passwords | Must |
| FR-3 | The system shall support a password reset through a single-use emailed link valid for 1 hour | Must |
| FR-4 | An owner shall be able to create, view, edit and delete assets in 8 categories | Must |
| FR-5 | Asset credentials and notes shall be encrypted, and shown only after password re-entry | Must |
| FR-6 | An owner shall be able to upload PDF, image, DOCX and TXT files up to 10 MB | Must |
| FR-7 | An owner shall be able to invite nominees by email. An invite is valid for 14 days | Must |
| FR-8 | A nominee shall accept only while signed in with the invited email address | Must |
| FR-9 | An owner shall assign each asset and document to zero or more nominees | Must |
| FR-10 | An owner shall be able to write encrypted letters addressed to one nominee | Should |
| FR-11 | An owner shall be able to choose a check-in interval (7–180 days) and grace period (3–30 days) | Must |
| FR-12 | The system shall email a reminder 3 days before a check-in is due | Must |
| FR-13 | The system shall enter Grace when a check-in is missed, emailing the owner and their nominees | Must |
| FR-14 | The system shall release the vault when the grace period ends | Must |
| FR-15 | Any owner check-in shall return the status to Active and lock released items | Must |
| FR-16 | After release, a nominee shall see only the items assigned to them | Must |
| FR-17 | A nominee shall be able to report the owner's death. This starts Grace but does not release | Should |
| FR-18 | The system shall keep an activity log of security-relevant events | Must |
| FR-19 | The user shall be able to change their text size, and pages shall be readable aloud | Should |
| FR-20 | The user shall be able to delete their account and all of its data | Must |

## 4. Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-1 | Security | AES-256-GCM encryption at rest, with per-vault keys |
| NFR-2 | Security | Passwords hashed with bcrypt (cost ≥ 12) |
| NFR-3 | Security | Session cookies are HttpOnly and SameSite. CSRF protection is applied |
| NFR-4 | Security | Rate limiting on authentication and secret-reveal endpoints |
| NFR-5 | Privacy | Users cannot learn whether another email is registered (login, reset) |
| NFR-6 | Accessibility | WCAG 2.1 AA minimum. Body text contrast ≥ 7:1. Touch targets ≥ 48px |
| NFR-7 | Usability | Every action has a text label, and destructive actions need confirmation |
| NFR-8 | Performance | API responses < 500 ms for typical requests |
| NFR-9 | Reliability | The inactivity sweep can safely run repeatedly without sending duplicate emails |
| NFR-10 | Maintainability | Modular API, ORM migrations, automated tests |
| NFR-11 | Portability | Works with SQLite or PostgreSQL by changing configuration |

## 5. External interfaces
- **Email (SMTP)** for invitations, reminders and alerts.
- **REST API (JSON)** consumed by the React client.
