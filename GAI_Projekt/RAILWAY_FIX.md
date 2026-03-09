# Railway Deployment Fix Guide

## Problem: Railpack Error

Jeśli widzisz błąd "Railpack could not determine how to build the app", to rozwiązanie:

## ✅ Monorepo na Railway (Backend + Frontend + Worker)

Zalecana, stabilna konfiguracja: każdy serwis buduje się z kontekstu root repo, ale korzysta ze swojego Dockerfile w `apps/*`. Dzięki temu dostępny jest katalog `packages/` podczas buildu.

1) Backend (GAI_Projekt = backend)
- Service Path: `/` (root repo)
- Builder: `Dockerfile`
- Dockerfile Path: `apps/backend/Dockerfile`
- Port: `8000` (EXPOSE w Dockerfile)
- Healthcheck: `GET /health`

2) Frontend (Next.js)
- Service Path: `/`
- Builder: `Dockerfile`
- Dockerfile Path: `apps/web/Dockerfile`
- Port: `3000` (EXPOSE w Dockerfile)
- Healthcheck: `GET /api/system/status`
- Env: `BACKEND_URL` (np. `https://<backend>.up.railway.app`), `WS_URL` (np. `wss://<backend>.up.railway.app`)

3) Worker (Celery)
- Service Path: `/`
- Builder: `Dockerfile`
- Dockerfile Path: `apps/worker/Dockerfile`
- Env: wymagane `REDIS_URL` (np. `redis://default:<password>@<host>:6379/0`), opcjonalnie `WAKE_CYCLE_MIN`

W integracji GitHub ustaw po prostu repo, a dla każdego serwisu w Railway wskaż powyższą konfigurację. Ta zmiana eliminuje błąd `COPY packages: not found` (katalog `packages/` jest dostępny tylko z kontekstu root).

## ✅ Rozwiązanie: Użyj prostej konfiguracji Python

### Krok 1: Użyj najprostszej konfiguracji

```bash
# Użyj prostej konfiguracji Railway
cp railway-simple-buildpack.json railway.json

# Zrób commit i push
git add railway.json
git commit -m "Użyj prostej konfiguracji Railway Python"
git push origin master
```

### Krok 2: (Alternatywa) Buildpack tylko dla prostych projektów

Dla tego monorepo rekomendowany jest Dockerfile per serwis. Buildpack może nie zadziałać poprawnie z katalogiem `packages/` oraz wieloma usługami.

### Krok 3: Ustaw zmienne środowiskowe w Railway

W Railway Dashboard ustaw:

```bash
# Podstawowe zmienne
PORT=8000
PYTHONPATH=.

# Baza danych (Railway dostarczy automatycznie)
DATABASE_URL=postgresql://user:password@host:port/database
REDIS_URL=redis://host:port/database

# Bezpieczeństwo
SECRET_KEY=your-secret-key-here-min-32-chars
GAI_PANEL_PASSWORD=your-secure-password-here
```

## Alternatywne konfiguracje

### Konfiguracja 1: Backend tylko
```bash
cp railway-backend-simple.json railway.json
git add railway.json
git commit -m "Użyj konfiguracji backend"
git push origin master
```

### Konfiguracja 2: Wiele serwisów
```bash
cp railway-services.json railway.json
git add railway.json
git commit -m "Użyj konfiguracji wielu serwisów"
git push origin master
```

### Konfiguracja 3: Buildpack
```bash
cp railway-buildpack-final.json railway.json
git add railway.json
git commit -m "Użyj buildpack konfiguracji"
git push origin master
```

## Dostępne pliki konfiguracyjne

- `railway.json` - Główna konfiguracja (używaj tej)
- `railway-simple-buildpack.json` - Prosta konfiguracja Python
- `railway-backend-simple.json` - Konfiguracja backend
- `railway-services.json` - Konfiguracja wielu serwisów
- `railway-buildpack-final.json` - Konfiguracja buildpack
- `railway.toml` - Alternatywna konfiguracja TOML

## Co zawiera projekt

### Pliki Railway
- ✅ `requirements.txt` - Zależności Python
- ✅ `runtime.txt` - Wersja Python 3.11
- ✅ `main.py` - Główna aplikacja FastAPI
- ✅ `main-simple.py` - Prosta aplikacja FastAPI
- ✅ `railway.json` - Konfiguracja Railway
- ✅ `start.sh` - Skrypt startowy
- ✅ `build.sh` - Skrypt build
- ✅ `package.json` - Konfiguracja Node.js

### Aplikacja
- ✅ `apps/backend/` - FastAPI backend
- ✅ `apps/web/` - Next.js frontend
- ✅ `apps/worker/` - Celery worker
- ✅ `packages/` - Wspólne pakiety

## Test lokalny

Przed deploymentem przetestuj lokalnie:

```bash
# Test backendu
cd apps/backend
python -m uvicorn main:app --reload

# Test frontendu
cd apps/web
npm install
npm run dev

# Test workera
cd apps/worker
celery -A celery_app.celery worker --loglevel=INFO
```

## Rozwiązywanie problemów

1. **Błąd Railpack**: Przełącz builder na `Dockerfile` z Service Path `/`.
2. **Błąd buildu**: Jeśli widzisz `ERROR: COPY packages: not found`, zmień Service Path na `/` i wskaż `apps/*/Dockerfile`.
3. **Błąd startu**: Sprawdź zmienne środowiskowe (`GAI_PANEL_PASSWORD`, `REDIS_URL`, `DATABASE_URL`).
4. **Problem z portem**: Dockerfile backendu używa `8000`; Railway poradzi sobie z routingiem. Jeśli chcesz wymusić port z env, zmień CMD na `sh -c "python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"`.
5. **Problem z bazą**: Upewnij się, że PostgreSQL/Redis są podłączone i że adresy w `DATABASE_URL`/`REDIS_URL` są poprawne.

## Alternatywne platformy

Jeśli Railway nadal nie działa:
- **Vercel** dla frontendu
- **Render** dla backendu
- **Fly.io** dla wszystkich serwisów
- **DigitalOcean App Platform**

## Kontakt

Jeśli nadal masz problemy, sprawdź:
- Railway logs w dashboardzie
- Użyj `railway logs` w CLI
- Sprawdź status serwisów w Railway dashboard
