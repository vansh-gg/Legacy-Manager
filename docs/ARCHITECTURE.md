# Architecture & UML

All diagrams are written in Mermaid, which GitHub renders automatically.

## System architecture

```mermaid
flowchart LR
  subgraph Browser
    UI[React SPA<br/>accessible UI]
  end
  subgraph Server[Node.js server]
    API[Express REST API<br/>helmet · rate limit · CSRF · Zod]
    SVC[Services<br/>check-in state machine]
    CRON[node-cron<br/>hourly sweep]
    CRYPTO[Crypto<br/>AES-256-GCM + HKDF]
  end
  DB[(SQLite / PostgreSQL<br/>via Prisma)]
  FS[(Encrypted file storage)]
  MAIL[SMTP / dev mailbox]

  UI -- HTTPS JSON + HttpOnly cookie --> API
  API --> SVC
  CRON --> SVC
  API --> CRYPTO
  SVC --> DB
  API --> DB
  CRYPTO --> FS
  SVC --> MAIL
```

## Use-case diagram

```mermaid
flowchart LR
  Owner((Owner))
  Nominee((Nominee))
  Scheduler((Scheduler))

  Owner --- UC1[Register / log in]
  Owner --- UC2[Manage assets]
  Owner --- UC3[Upload documents]
  Owner --- UC4[Invite nominees]
  Owner --- UC5[Assign items]
  Owner --- UC6[Write letters]
  Owner --- UC7[Check in]
  Owner --- UC8[View activity]

  Nominee --- UC9[Accept / decline invitation]
  Nominee --- UC10[Report a passing]
  Nominee --- UC11[View released items]

  Scheduler --- UC12[Send reminders]
  Scheduler --- UC13[Start grace period]
  Scheduler --- UC14[Release vault]
```

## Legacy status: state diagram

```mermaid
stateDiagram-v2
  [*] --> ACTIVE
  ACTIVE --> REMINDED: 3 days before due date
  REMINDED --> GRACE: due date passes
  ACTIVE --> GRACE: due date passes / nominee reports
  REMINDED --> GRACE: nominee reports
  GRACE --> RELEASED: grace period ends
  REMINDED --> ACTIVE: check-in
  GRACE --> ACTIVE: check-in
  RELEASED --> ACTIVE: check-in (access locked again)
```

## ER diagram

```mermaid
erDiagram
  USER ||--o{ ASSET : owns
  USER ||--o{ DOCUMENT : owns
  USER ||--o{ LETTER : writes
  USER ||--o{ NOMINEE : "names (owner)"
  USER |o--o{ NOMINEE : "is (linked account)"
  USER ||--o{ AUDIT_LOG : has
  USER ||--o{ ACTION_TOKEN : has
  NOMINEE ||--o{ ASSET_SHARE : receives
  NOMINEE ||--o{ DOCUMENT_SHARE : receives
  NOMINEE ||--o{ LETTER : "addressed to"
  NOMINEE ||--o{ ACTION_TOKEN : "invited by"
  ASSET ||--o{ ASSET_SHARE : "shared via"
  DOCUMENT ||--o{ DOCUMENT_SHARE : "shared via"

  USER {
    string id PK
    string email UK
    string passwordHash
    int checkInIntervalDays
    int gracePeriodDays
    datetime lastCheckInAt
    string legacyStatus
    datetime graceEndsAt
  }
  NOMINEE {
    string id PK
    string ownerId FK
    string userId FK
    string email
    string relationship
    string status
  }
  ASSET {
    string id PK
    string ownerId FK
    string category
    string title
    string secretEnc "AES-256-GCM"
    string instructions
  }
  DOCUMENT {
    string id PK
    string ownerId FK
    string storageKey "encrypted file"
    string mimeType
  }
  LETTER {
    string id PK
    string nomineeId FK
    string bodyEnc "AES-256-GCM"
  }
  ACTION_TOKEN {
    string tokenHash UK "SHA-256"
    string type
    datetime expiresAt
  }
```

## Sequence: inactivity and release

```mermaid
sequenceDiagram
  autonumber
  participant C as Cron (hourly)
  participant S as Legacy service
  participant DB as Database
  participant M as Mailer
  actor O as Owner
  actor N as Nominee

  C->>S: runInactivitySweep()
  S->>DB: find users not RELEASED
  alt 3 days before due
    S->>DB: status = REMINDED
    S->>M: reminder with one-click check-in link
    M-->>O: "Friendly reminder"
  else due date passed
    S->>DB: status = GRACE, graceEndsAt
    S->>M: urgent email to owner, heads-up to nominees
  else grace period ended
    S->>DB: status = RELEASED
    S->>M: "Items left for you"
    M-->>N: email with portal link
  end
  O->>S: clicks "Yes, I am well" (any time)
  S->>DB: status = ACTIVE, timer reset
```

## Sequence: viewing an encrypted secret

```mermaid
sequenceDiagram
  actor U as Owner
  participant UI as React app
  participant API as Express API
  participant DB as Database
  U->>UI: "Show private details"
  UI->>U: asks for password
  U->>UI: password
  UI->>API: POST /api/assets/:id/reveal (cookie + CSRF header)
  API->>DB: load asset where ownerId = session user
  API->>API: bcrypt.compare(password)
  API->>API: HKDF(masterKey, ownerId) → AES-256-GCM decrypt
  API->>DB: audit SECRET_VIEWED
  API-->>UI: { username, password, notes }
  UI-->>U: shown until the dialog closes
```

## Class diagram (server modules)

```mermaid
classDiagram
  class AuthRoutes {
    +register()
    +login()
    +forgotPassword()
    +resetPassword()
    +changePassword()
  }
  class LegacyService {
    +recordCheckIn(user, via)
    +runInactivitySweep(now)
    +enterGrace(user, opts)
    +releaseVault(user)
  }
  class Crypto {
    +encryptText(ownerId, text)
    +decryptText(ownerId, payload)
    +encryptBuffer()
    +decryptBuffer()
    +hashToken(token)
  }
  class Storage {
    +saveEncrypted(ownerId, buf)
    +readDecrypted(ownerId, key)
    +sniffMime(buf)
  }
  class Mailer {
    +sendMail(opts)
  }
  class Audit {
    +audit(userId, action, detail)
  }
  AuthRoutes --> LegacyService
  LegacyService --> Mailer
  LegacyService --> Audit
  Storage --> Crypto
```
