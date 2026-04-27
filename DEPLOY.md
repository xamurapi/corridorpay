# CorridorPay — Production Deploy

Полностью контейнеризированный staging/prod-стек на одном Linux-сервере. Включает:
- **postgres** (16-alpine, internal-only)
- **api** (FastAPI, gunicorn × 4 worker)
- **web** (Next.js standalone)
- **nginx** (reverse proxy, TLS, security headers, rate-limit)
- **certbot** + **certbot-renew** (Let's Encrypt)

Reverse proxy маршрутизирует:

| Хост | Бэкенд |
|---|---|
| `${PRIMARY_DOMAIN}` | web:3030 (лендинг + cabinet, RU/EN) |
| `${ADMIN_DOMAIN}` | web:3030 → `/admin/*` (админка, RU) |
| `${API_DOMAIN}` | api:8000 (FastAPI) |

## Требования к серверу

- Ubuntu 22.04+ или Debian 12+
- 2 CPU / 4 GB RAM / 40 GB SSD (минимум)
- Открытые порты: **22** (SSH), **80**, **443**
- Установлены: `docker` ≥ 24, `docker compose` plugin, `git`

## Первый запуск (пошагово)

### 1. DNS
Заведи 3 A-записи на IP сервера:
```
corridorpay.example.com         A   1.2.3.4
api.corridorpay.example.com     A   1.2.3.4
admin.corridorpay.example.com   A   1.2.3.4
```
Дождись пропагации: `dig corridorpay.example.com +short` должен вернуть IP.

### 2. Деплой-ключ для приватного репозитория

Репозиторий приватный, поэтому серверу нужен read-only SSH-ключ, привязанный
именно к этому репо (а не к учётке владельца).

**На сервере** (ещё до клонирования) выполни:
```bash
# Скачать только сам скрипт без клонирования
curl -fsSL https://raw.githubusercontent.com/xamurapi/corridorpay/main/product/scripts/setup-deploy-key.sh -o /tmp/setup-deploy-key.sh
# Это работает только если репо public. Для приватного — см. альтернативу ниже.
bash /tmp/setup-deploy-key.sh
```

> ⚠️ Так как репо **приватный**, `curl` выше не сработает. Альтернатива:
> 1. Скопируй содержимое `product/scripts/setup-deploy-key.sh` из локальной машины
>    одним SCP: `scp product/scripts/setup-deploy-key.sh user@server:/tmp/`
> 2. Запусти на сервере: `bash /tmp/setup-deploy-key.sh`

Скрипт:
- генерирует ed25519 ключ в `~/.ssh/corridorpay_deploy_ed25519`
- добавляет SSH host-alias `github-corridorpay` в `~/.ssh/config`
- печатает публичный ключ для вставки в GitHub
- проверяет соединение

После того как ты добавишь ключ на странице
`https://github.com/xamurapi/corridorpay/settings/keys/new`
(оставь "Allow write access" **выключенной**) — нажми Enter в скрипте.

### 3. Клонировать код
```bash
git clone git@github-corridorpay:xamurapi/corridorpay.git /opt/corridorpay
cd /opt/corridorpay/product
```

### 4. Сгенерировать `.env.production` с сильными секретами
```bash
bash scripts/init-env.sh        # пишет .env.production со случайными JWT_SECRET и DB password (mode 600)
nano .env.production            # заполни PRIMARY_DOMAIN, API_DOMAIN, ADMIN_DOMAIN, LETSENCRYPT_EMAIL,
                                # синхронизируй CORS_ORIGINS / NEXT_PUBLIC_API_URL с реальными доменами
```

### 5. Деплой
```bash
bash scripts/deploy.sh
```
Скрипт собирает образы, поднимает Postgres, прогоняет миграции + seed, запускает api/web/nginx.
На этом этапе nginx работает в **bootstrap-режиме** (только HTTP-80) — TLS ещё нет.

### 6. Получить TLS-сертификаты
```bash
# Тест с Let's Encrypt staging (необязательно, но рекомендуется первый раз):
LETSENCRYPT_STAGING=1 bash scripts/init-letsencrypt.sh
# Если всё ок — отключи staging в .env.production и повтори:
LETSENCRYPT_STAGING=0 bash scripts/init-letsencrypt.sh
```
Скрипт получит cert через webroot challenge и перезапустит nginx — он сам подхватит сертификат и переключится на `10-app.conf` (HTTPS + редирект с HTTP).

### 7. Проверка
```bash
curl -fsS https://${PRIMARY_DOMAIN}/ru               # лендинг
curl -fsS https://${API_DOMAIN}/health               # API
curl -fsS https://${ADMIN_DOMAIN}/login              # админка
docker compose -f docker-compose.prod.yml ps         # все сервисы Up
docker compose -f docker-compose.prod.yml logs -f    # логи
```

## Обновление кода

```bash
cd /opt/corridorpay/product
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml build
docker compose --env-file .env.production -f docker-compose.prod.yml --profile init run --rm migrate
docker compose --env-file .env.production -f docker-compose.prod.yml up -d api web nginx
```

Для zero-downtime — поставь две реплики api за nginx upstream-ом.

## Перезагрузка nginx после ротации серта

Сертификат продлевается автоматически (`certbot-renew` крутится в фоне), но nginx нужно
перезапустить, чтобы подхватить новый cert. Поставь cron на хосте:

```cron
# /etc/cron.d/corridorpay-nginx-reload
0 4 * * 0  root  cd /opt/corridorpay/product && docker compose -f docker-compose.prod.yml exec -T nginx nginx -s reload
```

## Бэкапы Postgres

```bash
# Раз в сутки в 03:00
0 3 * * *  root  docker exec cp_postgres pg_dump -U corridorpay corridorpay | gzip > /var/backups/cp/cp-$(date +\%F).sql.gz
```

Снимки старше 30 дней — удалять. Загружай в S3 (rclone, restic).

## Что не покрыто здесь (нужно отдельно для реального prod)

- **Email/SMS-провайдер** — backend сейчас выводит `debug_code` в response (dev-mode). Подключи Postmark/Mailgun + Twilio в `app/services/otp.py`.
- **Реальные PSP-интеграции** — есть структура моделей и admin-управление, нужны адаптеры (`app/services/psp/<name>.py`) и договоры с PSP-партнёрами.
- **KYC-провайдер** (Sumsub) — сейчас только manual-flow.
- **Sentry / Prometheus / Loki** — добавить middleware и docker-compose.
- **Cloudflare** — поставить перед nginx (DNS + WAF + DDoS).
- **Юр.лицо + лицензии + compliance officer** — без этого реальные деньги пускать нельзя.
