# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CNM360 LLP — AI-enabled integrated financial automation platform for Indian businesses (SMEs, CA firms, housing societies). SaaS with accounting automation, payroll, society accounting, and document processing.

Reference doc: `CNM360_LLP_Business_WriteUp.docx`

## Commands

```bash
# Start everything (requires Docker)
docker-compose up

# Backend only (requires PostgreSQL running)
cd backend && uvicorn app.main:app --reload

# Frontend only
cd frontend && npm run dev      # http://localhost:5173
cd frontend && npm run build    # type-check + bundle
```

API docs auto-generated at `http://localhost:8000/docs` when backend is running.

## Architecture

### Backend (`backend/`) — FastAPI + SQLAlchemy + PostgreSQL

```
app/
├── main.py          # FastAPI entry point; creates all tables on startup via create_all
├── config.py        # Pydantic-settings; reads DATABASE_URL, SECRET_KEY etc. from env
├── database.py      # SQLAlchemy engine, SessionLocal, Base
├── models/          # SQLAlchemy ORM models (user, accounting, payroll)
├── schemas/         # Pydantic v2 request/response schemas
├── services/        # Business logic (auth, accounting, payroll)
└── api/v1/          # FastAPI routers (auth, accounting, payroll, dashboard)
```

**Key data flows:**
- Auth: `POST /api/v1/auth/register` creates Org + User, seeds default chart of accounts, returns JWT. All protected routes use `Bearer` token via `app/api/deps.py`.
- Accounting: Double-entry enforced at schema level (`JournalEntryCreate` validates debit == credit). Journal entries post to `journal_lines`; reports aggregate over posted entries only.
- Payroll: `process_payroll_run` calculates PF (12% basic), ESIC (0.75%/3.25% if gross ≤ ₹21k), Professional Tax (Maharashtra slab), pro-rated by days worked.

**Compliance calculations (Indian statutory):**
- PF: Employee 12% + Employer 12% of basic salary
- ESIC: Employee 0.75% + Employer 3.25% of gross (only if gross ≤ ₹21,000/month)
- Professional Tax (Maharashtra): ₹0 if gross ≤ ₹7,500 | ₹175 if ≤ ₹10,000 | ₹200 above

### Frontend (`frontend/`) — React 18 + TypeScript + Vite + Tailwind CSS v3

```
src/
├── App.tsx              # BrowserRouter + all routes
├── contexts/AuthContext.tsx   # JWT stored in localStorage; auto-fetches /auth/me on load
├── services/api.ts      # Axios instance with Bearer interceptor + 401 → /login redirect
├── types/index.ts       # All shared TypeScript interfaces
├── pages/
│   ├── accounting/      # ChartOfAccounts, JournalEntries, NewJournalEntry, Reports
│   └── payroll/         # Employees, NewEmployee, PayrollRuns, PayrollRunDetail
└── components/          # Layout, Sidebar, ProtectedRoute
```

All API calls use the Vite proxy (`/api` → `http://localhost:8000`) so no CORS issues in dev.

## Environment Variables

Backend (`.env` in `backend/`):
```
DATABASE_URL=postgresql://cnm360:cnm360password@postgres:5432/cnm360
SECRET_KEY=<long random string>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

## What's Not Built Yet (Phase 2)

- OCR / intelligent document processing (requires ML infra + training data)
- Society accounting module
- Tally / Zoho / ERP integrations
- Mobile app
- Multi-entity support
