.PHONY: dev backend frontend test seed migrate db-up db-down

db-up:
	docker compose up -d --wait postgres redis

db-down:
	docker compose down

migrate:
	cd backend && alembic upgrade head

seed:
	cd backend && python -m scripts.seed

backend:
	cd backend && uvicorn app.main:app --reload --port 8000

frontend:
	cd web && npm run dev

test:
	cd backend && pytest -q
	cd web && npm test --silent || true

dev: db-up migrate seed
	@echo "DB ready. Now run: make backend (in one shell) and make frontend (in another)."
