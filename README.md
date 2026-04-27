# CorridorPay

Мультивалютная платформа трансграничных переводов через локальные платёжные рельсы (12 корридоров, 132 валютные пары) — реальный код, без описательных страниц.

## Стек

- **Backend:** FastAPI + SQLAlchemy 2.x async + PostgreSQL 15/16 + Alembic + pytest
- **Frontend:** Next.js 15 (App Router) + TypeScript + next-intl (RU/EN) + темная тема
- **Auth:** JWT (HS256, access 15m / refresh 7d), OTP по email
- **Дизайн-токены:** `--c-bg #0a0a0f`, `--c-accent #6c63ff` (из образца)

## Структура

```
product/
├── backend/                       # FastAPI
│   ├── app/
│   │   ├── api/v1/auth/          # /v1/auth (signup, login, OTP, refresh)
│   │   ├── api/v1/public/        # /v1/public (corridors, fx-rates, quotes, lead, contact)
│   │   ├── api/v1/cabinet/       # /v1 (me, wallets, recipients, transactions, kyc, ...)
│   │   ├── api/admin/            # /admin/v1 (dashboard, users, transactions, kyc, fx, corridors, psp, audit)
│   │   ├── core/                 # config, security, deps, errors
│   │   ├── db/                   # session, base
│   │   ├── models/               # users, wallets, transactions, ledger, fx, corridor, kyc, audit, ...
│   │   ├── schemas/              # Pydantic
│   │   └── services/             # fx, ledger, transactions, otp, audit
│   ├── alembic/versions/         # 0001_initial.py
│   ├── tests/                    # pytest (security, fx_math, smoke)
│   └── scripts/seed.py           # 12 corridors, 17 PSPs, FX rates, demo users
│
├── web/                          # Next.js
│   └── src/app/
│       ├── [locale]/(public)/    # лендинг + калькулятор + корридоры + pricing + contacts + legal/* (RU/EN)
│       ├── [locale]/(auth)/      # /auth/login, /auth/signup (RU/EN)
│       ├── [locale]/cabinet/     # ЛК (RU/EN): dashboard, wallets, send wizard, transactions/[id], recipients, kyc, settings, notifications, support, limits, api, referral
│       └── admin/                # Админка (только RU): login + (app)/dashboard, users, transactions, kyc-queue, fx, corridors, psp, audit-log, staff, settings
│
├── db/init/                      # SQL расширения
├── docker-compose.yml            # postgres:15 на 5434, redis:7-alpine на 6379
└── Makefile
```

## Запуск (локально)

```bash
# 1. PostgreSQL через Docker (на порту 5434, чтобы не конфликтовать)
docker compose up -d postgres

# 2. Backend
cd backend
python -m venv .venv
source .venv/Scripts/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
python -m scripts.seed                 # 12 корридоров + 17 PSPs + FX + demo users
uvicorn app.main:app --reload --port 8000

# 3. Тесты
pytest -q                              # 7 passed

# 4. Frontend (отдельный shell)
cd ../web
npm install
npm run dev                            # http://localhost:3030
```

## URLs

- Public landing: http://localhost:3030/ru ·  http://localhost:3030/en
- Auth login:     http://localhost:3030/ru/auth/login
- Cabinet:        http://localhost:3030/ru/cabinet/dashboard
- Admin login:    http://localhost:3030/admin/login
- Admin:          http://localhost:3030/admin/dashboard
- API docs:       http://localhost:8000/api/docs
- Health:         http://localhost:8000/health

## Demo учётные записи (после seed)

| Роль | Email | Пароль |
|------|-------|--------|
| superadmin | `admin@corridorpay.ru` | `admin12345` |
| user (Tier 2) | `demo@corridorpay.ru` | `demo12345` |

## Что реализовано (vs ТЗ)

**Backend:**
- ✓ Auth flow (signup → email OTP → verify → JWT, login по паролю/OTP, refresh, logout)
- ✓ Все 12 корридоров с лимитами/маркапами/TTL rate-lock
- ✓ FX engine с кросс-курсами через USD-якорь
- ✓ Quote + lock (с TTL и привязкой к user)
- ✓ Wallets (12 валют, balance/blocked, CHECK constraints)
- ✓ Recipients CRUD
- ✓ Transactions: FSM (created → risk_check → rate_locked → ... → completed), idempotency-key
- ✓ Double-entry ledger (с проверкой баланса по валютам перед коммитом)
- ✓ KYC заявки + решения admin
- ✓ Notifications, support tickets
- ✓ Admin API: dashboard, users, transactions, kyc-queue, fx, corridors, psp, audit-log
- ✓ Audit log (X-Admin-Reason обязателен на mutation)
- ✓ pytest: 7 passed (security, FX math, smoke)

**Frontend:**
- ✓ Next.js 15 App Router + next-intl RU/EN (URL routing /ru, /en)
- ✓ Лендинг: hero, live калькулятор, 12 корридоров, how-it-works, кейсы, CTA
- ✓ Публичные страницы: /calculator, /corridors, /pricing, /contacts, /legal/[slug]
- ✓ Auth: signup (с OTP), login (OTP / password)
- ✓ Cabinet (RU/EN): 12 разделов
- ✓ Admin (только RU): 9 разделов + login
- ✓ Темная тема с дизайн-токенами образца, status badges, sidebar, top-bar

## Что покрыто как stub (для расширения)

- API-keys CRUD на frontend (есть BE-схема, нет UI)
- Webhook subscriptions
- PCI-iframe для карт (iframe от PSP)
- Реальные PSP-адаптеры (есть унифицированный интерфейс в моделях)
- WebSocket realtime для send wizard
- Sumsub WebSDK для KYC Tier 2
- PDF generation (Jinja + WeasyPrint)
- Cookie-banner (consent сохранение)

## Расширение

- Добавить PSP: создать `app/services/psp/<name>.py` имплементировав интерфейс из ТЗ §9.1
- Добавить корридор: запись в `corridors` через миграцию или admin /admin/v1/corridors
- Новый язык: `messages/<locale>.json` + добавить в `routing.locales`
- Новый раздел кабинета: `web/src/app/[locale]/cabinet/<name>/page.tsx` + ссылка в Sidebar.tsx
