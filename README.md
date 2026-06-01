# UI Copilot

A local developer tool that automates website usability audits. Provide a URL or upload screenshots — a headless Playwright browser captures the page state and DOM structure, feeds it into GPT-4o Vision, and returns a step-by-step Agile User Story timeline detailing user actions, system responses, and exact friction points. Each user has their own account with audit history, a subscription plan, and the ability to compare audits side by side.

---

## How it works

```
URL or Screenshots
       │
       ▼
Playwright (headless Chromium)
  └─ Screenshot + DOM extraction (labels, aria attributes)
       │
       ▼
GPT-4o Vision — Pass 1: Initial audit
       │
       ▼
GPT-4o — Pass 2: Self-critique
  └─ Checks severity mismatches, vague frictions, false positives,
     generic recommendations
       │
       ▼
GPT-4o — Pass 3: Refinement (only if issues found)
       │
       ▼
Structured audit report saved to SQLite per user
  ├─ UX score (0–100)
  ├─ Agile User Story timeline
  ├─ Accessibility issues (WCAG)
  └─ Coverage gaps
```

---

## Features

### Auditing
- **URL audit** — paste any URL, Playwright launches a headless browser, captures the viewport screenshot and full DOM structure including multi-page crawl
- **Image audit** — upload one or more PNG / JPEG / WebP screenshots directly
- **Agile User Story timeline** — step-by-step walkthrough of the user journey with actions, system responses, friction points, and severity labels
- **Accessibility report** — WCAG-mapped issues with element-level specificity
- **3-pass self-critique loop** — GPT-4o reviews its own output and corrects severity mismatches, false positives, vague frictions, and generic recommendations
- **Persona hint & project description** — optional context to focus the audit on a specific user type or product
- **False-positive prevention** — DOM label detection (`<label for>`, wrapping `<label>`, `aria-label`, `aria-labelledby`) is extracted and explicitly marked in the prompt so GPT cannot invent missing labels

### Accounts & History
- **User registration** — username (4–20 chars, alphanumeric + underscores), email, and password (4–20 chars, at least one letter and one number)
- **Email verification** — verification link is printed to the backend terminal; follow it to activate the account
- **Login** — accepts either username or email in the same field
- **Password reset** — request a reset link by email; the link is printed to the backend terminal and expires after 1 hour; reusing the old password is rejected
- **JWT authentication** — 7-day tokens stored in `localStorage`; any 401 response automatically logs the user out
- **Account deletion** — two-step confirmation in the header; deletes all audit history via cascade
- **Per-user audit history** — every audit is saved to SQLite and listed in a history panel; audits can be restored, deleted individually, or cleared all at once

### Subscription plans
| Plan | Audits / month | Price |
|------|---------------|-------|
| Free | 3 | $0 |
| Pro | 10 | $4.99 |
| Premium | Unlimited | $19.99 |

- Plan and credit usage are displayed in a panel at the bottom of the page
- Progress bar tracks monthly usage; resets every 30 days
- Upgrade or switch plans instantly (no payment processing — local demo tool)
- `testuser` is always seeded as Premium automatically

### Comparison
- After any audit, a **Compare** button appears next to the score
- Pick any previous audit from history to compare against
- Side-by-side view shows:
  - Score delta with colored badge (e.g. `+7`, `-3`)
  - Per-severity friction and accessibility counts with deltas
  - Step-by-step timeline diff: `✓ Resolved`, `✗ New`, `↓ Improved`, `↑ Worsened`
  - Accessibility issues grouped into Resolved / New / Unchanged

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Python · FastAPI · Playwright · OpenAI Python SDK |
| Database | SQLite (built-in, no setup required) |
| Auth | bcrypt 5.x · python-jose JWT |
| AI | GPT-4o Vision (3-pass critique loop) |
| Frontend | React · TypeScript · Vite |

---

## Project structure

```
UI_Copilot/
├── backend/
│   ├── main.py                    # FastAPI app, CORS, OpenAI client lifecycle
│   ├── db.py                      # SQLite setup, all user/audit/subscription CRUD
│   ├── requirements.txt
│   ├── .env.example
│   ├── data/                      # SQLite database (git-ignored)
│   ├── core/
│   │   ├── browser.py             # Playwright capture + DOM/label extraction
│   │   ├── vision.py              # GPT-4o Vision — 3-pass analysis loop
│   │   ├── audit.py               # Orchestration layer
│   │   └── auth_utils.py          # Validation, bcrypt hashing, JWT
│   ├── models/
│   │   └── schemas.py             # Pydantic request/response models
│   └── api/
│       ├── routes.py              # POST /api/audit/url, POST /api/audit/image
│       ├── auth_routes.py         # Register, login, verify, forgot/reset password, delete account
│       ├── history_routes.py      # GET/DELETE audit history
│       ├── subscription_routes.py # GET plan, POST upgrade
│       └── deps.py                # get_current_user dependency
└── frontend/
    └── src/
        ├── App.tsx
        ├── api.ts
        ├── types.ts
        ├── index.css
        ├── lib/
        │   └── AuthContext.tsx     # Auth state, token persistence, 401 handler
        └── components/
            ├── AuthPage.tsx        # Sign in / register / verify / reset password
            ├── AuditForm.tsx       # URL + multi-image upload form
            ├── AuditHistory.tsx    # Past audits list
            ├── SubscriptionPanel.tsx
            ├── CompareView.tsx     # Side-by-side audit comparison
            ├── ComparePicker.tsx   # History picker modal
            ├── ScoreBadge.tsx
            ├── Timeline.tsx
            ├── A11yIssues.tsx
            └── CoverageGaps.tsx
```

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- An OpenAI API key with GPT-4o access

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt
playwright install chromium

cp .env.example .env
# Edit .env — set OPENAI_API_KEY and JWT_SECRET
```

### Frontend

```bash
cd frontend
npm install
```

---

## Running locally

**Terminal 1 — Backend**
```bash
cd UI_Copilot
backend/.venv/bin/uvicorn backend.main:app --port 8000 --reload
```

**Terminal 2 — Frontend**
```bash
cd UI_Copilot/frontend
npm run dev
```

Open **http://localhost:5173**

The Vite dev server proxies `/api/*` to the backend at `localhost:8000`, so no CORS configuration is needed during development.

Interactive API docs: **http://localhost:8000/docs**

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | — | Required. Your OpenAI API key |
| `JWT_SECRET` | — | Required. Long random string used to sign JWT tokens |
| `OPENAI_MODEL` | `gpt-4o` | Model to use for all three passes |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Comma-separated CORS origins |

---

## API

All audit and history endpoints require an `Authorization: Bearer <token>` header.

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Create account (returns pending — verify via terminal link) |
| `POST` | `/api/auth/login` | Sign in with username or email |
| `GET` | `/api/auth/verify/{token}` | Activate account via email verification token |
| `POST` | `/api/auth/forgot-password` | Print reset link to terminal |
| `POST` | `/api/auth/reset-password` | Apply new password using reset token |
| `DELETE` | `/api/auth/account` | Delete account and all audit history |
| `GET` | `/api/auth/me` | Get current user info |

### Audits

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/audit/url` | Run audit on a URL |
| `POST` | `/api/audit/image` | Run audit on uploaded screenshots (`multipart/form-data`) |

`POST /api/audit/url` body:
```json
{
  "url": "https://example.com",
  "persona_hint": "First-time visitor unfamiliar with the product",
  "project_description": "E-commerce store selling handmade goods"
}
```

`POST /api/audit/image` fields:
- `files` — one or more PNG, JPEG, or WebP files (max 10 MB each)
- `persona_hint` — optional string
- `project_description` — optional string

### History

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/history` | List all audits for the current user |
| `GET` | `/api/history/{id}` | Get full report for one audit |
| `DELETE` | `/api/history` | Clear all audits |
| `DELETE` | `/api/history/{id}` | Delete one audit |

### Subscription

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/subscription` | Get current plan and credit usage |
| `POST` | `/api/subscription/upgrade` | Switch plan: `{"plan": "free" \| "pro" \| "premium"}` |

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Returns `{"status": "ok"}` |

---

## Security

- Never commit `.env` — it is listed in `.gitignore`
- The SQLite database (`backend/data/`) is also git-ignored
- Use `.env.example` as a template; it contains only placeholder values
- Set `JWT_SECRET` to a long random string (e.g. `openssl rand -hex 32`)
- If your OpenAI API key is accidentally committed, rotate it immediately at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
