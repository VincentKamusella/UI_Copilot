# UI Copilot

A local developer tool that automates website usability audits. Provide a URL or upload a screenshot — a headless Playwright browser captures the page state and DOM structure, feeds it into GPT-4o Vision, and returns a step-by-step Agile User Story timeline detailing user actions, system responses, and exact friction points.

---

## How it works

```
URL or Image
     │
     ▼
Playwright (headless Chromium)
  └─ Screenshot + DOM extraction
     │
     ▼
GPT-4o Vision — Pass 1: Initial audit
     │
     ▼
GPT-4o — Pass 2: Self-critique
  └─ Checks severity mismatches, vague frictions, generic recommendations
     │
     ▼
GPT-4o — Pass 3: Refinement (only if issues found)
     │
     ▼
Structured audit report
  ├─ UX score (0–100)
  ├─ Agile User Story timeline
  └─ Accessibility issues (WCAG)
```

---

## Features

- **URL audit** — paste any URL, Playwright launches a headless browser, captures viewport screenshot and full DOM structure
- **Image audit** — upload a PNG / JPEG / WebP screenshot directly
- **Agile User Story timeline** — step-by-step walkthrough of the user journey with actions, system responses, friction points, and severity labels
- **Accessibility report** — WCAG-mapped issues with element-level specificity
- **3-pass self-critique loop** — GPT-4o reviews its own output and corrects severity mismatches, vague frictions, and generic recommendations before returning results
- **Persona hint** — optional context to focus the audit on a specific user type

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Python · FastAPI · Playwright · OpenAI Python SDK |
| AI | GPT-4o Vision (3-pass critique loop) |
| Frontend | React · TypeScript · Vite |

---

## Project structure

```
UI_Copilot/
├── backend/
│   ├── main.py               # FastAPI app, CORS, OpenAI client lifecycle
│   ├── requirements.txt
│   ├── .env.example
│   ├── core/
│   │   ├── browser.py        # Playwright capture + DOM extraction
│   │   ├── vision.py         # GPT-4o Vision — 3-pass analysis loop
│   │   └── audit.py          # Orchestration layer
│   ├── models/
│   │   └── schemas.py        # Pydantic request/response models
│   └── api/
│       └── routes.py         # POST /api/audit/url, POST /api/audit/image
└── frontend/
    └── src/
        ├── App.tsx
        ├── api.ts
        ├── types.ts
        └── components/
            ├── AuditForm.tsx
            ├── ScoreBadge.tsx
            ├── Timeline.tsx
            └── A11yIssues.tsx
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
# Edit .env and add your OPENAI_API_KEY
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

Interactive API docs are available at **http://localhost:8000/docs**

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | — | Required. Your OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o` | Model to use for all three passes |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Comma-separated CORS origins |

---

## API

### `POST /api/audit/url`
```json
{
  "url": "https://example.com",
  "persona_hint": "First-time visitor unfamiliar with the product"
}
```

### `POST /api/audit/image`
`multipart/form-data` with fields:
- `file` — PNG, JPEG, or WebP (max 10 MB)
- `persona_hint` — optional string

### `GET /api/health`
Returns `{"status": "ok"}`

---

## Security

- Never commit `.env` — it is listed in `.gitignore`
- Use `.env.example` as a template; it contains only placeholder values
- If your API key is accidentally committed, rotate it immediately at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
