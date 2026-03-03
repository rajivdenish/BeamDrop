# Phase 2: Authentication - Research

## What do I need to know to PLAN this phase well?

### 1. Zero-Setup Database for Users/Sessions
- **Requirement:** User accounts with invite links, session states, and offline persistence. However, `PROJECT.md` dictates zero prior dev setup.
- **Implementation:** Using an external DB like PostgreSQL requires a heavy installation which contradicts the zero-configuration goal. We will use a flat-file JSON DB approach (e.g. `data/db.json` using Node's `fs` or memory with periodic saves). We'll store:
  - `users`: ID, email, hashed password, role (admin/user), status (approved/pending).
  - `invites`: Token string, creator, expiration, used status.
  - `sessions`: Session ID mapping to user ID.

### 2. Password Security & State
- **Requirement:** Securely hash user passwords and handle logins.
- **Implementation:** Usually `bcrypt`, but to avoid native C++ build toolchain dependencies (which violate zero dev setup), it's highly recommended to use `bcryptjs` or Node's native `crypto.scrypt` for password hashing natively. We will use `crypto` which requires no `npm install` for native builds.

### 3. State/Session Management
- **Requirement:** User session persists across browser sessions (closing and reopening).
- **Implementation:** We'll implement a simple cookie-based session mechanism. Upon login, generate a secure random token (Session ID), save it in the JSON DB, and set a `HttpOnly` cookie. Middleware will check this cookie for protected routes.

### 4. Required API Endpoints
- `POST /api/auth/register` (takes email, password, and optionally `inviteToken`)
- `POST /api/auth/login` (generates session cookie)
- `POST /api/auth/logout` (destroys session)
- `POST /api/admin/invite` (generates a valid invite code, admin only)
- `POST /api/admin/approve` (approves a pending user manually)

### 5. UI Implementation
- Basic `login.html`, `register.html`, and a protected `home.html` acting as the main interface. Vanilla JS `fetch()` to handle forms.

## Validation Architecture
- **Step 1:** Verify the admin account creation logic works on first startup.
- **Step 2:** Verify normal registration fails without an invite token or admin approval.
- **Step 3:** Verify session persistence: logs in, receives a token, navigates to a new page, and remains logged in without re-authenticating.

## RESEARCH COMPLETE
