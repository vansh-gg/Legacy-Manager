# Test Cases

All cases below are automated (`npm test`) and run against an isolated test database.
**Result: 35 / 35 passing.**

| ID | Module | Description | Expected result |
|---|---|---|---|
| TC-AUTH-01 | Auth | Register a new user | 201, session started, no password hash returned |
| TC-AUTH-02 | Auth | Weak password / invalid email | 400 with a helpful message |
| TC-AUTH-03 | Auth | Duplicate email | 409 |
| TC-AUTH-04 | Auth | Password storage | Stored as a bcrypt hash, cost 12 |
| TC-AUTH-05 | Auth | Wrong password vs unknown email | Same 401 message (no account probing) |
| TC-AUTH-06 | Auth | 5 wrong passwords | Account locked (423), even for the correct password |
| TC-AUTH-07 | Auth | Protected route without a session | 401 |
| TC-AUTH-08 | Security | POST without the CSRF header | 403 |
| TC-AUTH-09 | Auth | Password reset link | Works once. Old sessions are revoked |
| TC-AUTH-10 | Auth | Change password | This device stays logged in, other devices are logged out |
| TC-AUTH-11 | Settings | Check-in schedule validation | Valid values saved, invalid values give 400 |
| TC-NOM-01 | Nominees | Add a nominee | 201, invitation email sent |
| TC-NOM-02 | Nominees | Add yourself / a duplicate | 400 / 409 |
| TC-NOM-03 | Nominees | Accept an invite | Only the matching account can accept. The link is single-use |
| TC-NOM-04 | Security | Edit another owner's nominee | 404 |
| TC-NOM-05 | Nominees | Decline, then resend | Old link revoked, new link issued |
| TC-AST-01 | Assets | Create an asset with a secret | Stored as ciphertext (`v1:` prefix) |
| TC-AST-02 | Assets | Reveal a secret | Wrong password gives 400, correct password returns the plaintext |
| TC-AST-03 | Assets | Full account number in the hint | 400 asking for the last 4 digits |
| TC-AST-04 | Assets | Update without a secret | The existing secret is kept |
| TC-AST-05 | Assets | Assign to another owner's nominee | 400 |
| TC-AST-06 | Security | Another user reveals / deletes an asset | 404 |
| TC-DOC-01 | Documents | Upload and download a PDF | Encrypted on disk, identical bytes when downloaded |
| TC-DOC-02 | Documents | Fake PDF (wrong magic bytes) | 400 |
| TC-DOC-03 | Security | Another user downloads | 404 |
| TC-LET-01 | Letters | Write a letter | Encrypted at rest, readable by the owner |
| TC-LEG-01 | Legacy | Full lifecycle | REMINDED → GRACE → RELEASED with the correct emails |
| TC-LEG-02 | Legacy | Nominee before release | 403 for the vault and its secrets |
| TC-LEG-03 | Legacy | Nominee after release | Sees only their own items, can reveal the secret |
| TC-LEG-04 | Security | Stranger opens a shared vault | 404 |
| TC-LEG-05 | Legacy | Owner checks in after release | Back to ACTIVE, nominee locked out |
| TC-LEG-06 | Legacy | One-click email check-in | Works without logging in |
| TC-LEG-07 | Legacy | Nominee reports a passing | GRACE started, nothing released, owner alerted |
| TC-LEG-08 | Reliability | Sweep run twice | No duplicate emails |
| TC-LEG-09 | Dashboard | Readiness checklist | Correct counts and step states |

## Manual / UI test checklist

| ID | Scenario | Result |
|---|---|---|
| UI-01 | All pages load with no console errors (desktop) | Pass |
| UI-02 | Phone width (375px): no sideways scrolling, menu works | Pass |
| UI-03 | Text size Normal / Large / Extra large applies everywhere | Pass |
| UI-04 | Keyboard only: Tab order, visible focus ring, Esc closes dialogs | Pass |
| UI-05 | Owner reveals a secret after re-entering the password | Pass |
| UI-06 | Release demo: owner misses check-in, nominee opens letter and items | Pass |
