# Railway Deployment Guide for GAI Agent

## Krytyczna konfiguracja dla monorepo (fix dla błędu "COPY packages: not found")

Aby wszystkie serwisy poprawnie zbudowały obraz z katalogiem `packages`, ustaw kontekst builda (Service Path) na root repo i wskaż właściwe Dockerfile dla każdego serwisu:

### Backend
- Source: GitHub (gałąź `master`)
- Service Path: `/` (root repo)
- Builder: `Dockerfile`
- Dockerfile Path: `apps/backend/Dockerfile`
- Env (minimalnie):
  - `GAI_PANEL_PASSWORD`
  - `DATABASE_URL` (opcjonalnie)
  - `REDIS_URL` (opcjonalnie)

### Worker
- Source: GitHub (gałąź `master`)
- Service Path: `/` (root repo)
- Builder: `Dockerfile`
- Dockerfile Path: `apps/worker/Dockerfile`
- Env (wymagane):
  - `REDIS_URL` (np. `redis://default:<password>@<host>:6379/0`)
  - `WAKE_CYCLE_MIN` (opcjonalnie)

### Web
- Source: GitHub (gałąź `master`)
- Service Path: `/` (root repo)
- Builder: `Dockerfile`
- Dockerfile Path: `apps/web/Dockerfile`
- Env:
  - `BACKEND_URL`: publiczny URL backendu (np. `https://<backend>.up.railway.app`)
  - `WS_URL`: `wss://<backend>.up.railway.app`

Po tej konfiguracji krok `COPY packages /app/packages` w logach builda backendu i workera powinien przejść poprawnie.

## Problem z Railpack

Jeśli widzisz błąd "Railpack could not determine how to build the app", przełącz builder na `Dockerfile` i ustaw Service Path na `/` (root repo), wskazując odpowiedni `apps/*/Dockerfile`.

## Metoda 1: Dockerfile per serwis (Zalecane)

Najbardziej stabilna metoda w monorepo: każdy serwis ma własny `Dockerfile` w `apps/*` i używa root kontekstu.

## Metoda 2: Wiele serwisów w jednym projekcie Railway

Dodaj trzy serwisy w jednym projekcie: Backend, Worker, Web — każdy z powyższą konfiguracją Docker.

## Metoda 3: Ręczna konfiguracja w Railway Dashboard

1. Przejdź do Railway Dashboard
2. Utwórz nowy projekt
3. Dodaj usługi ręcznie:
   - **Backend**: Użyj `apps/backend/Dockerfile`
   - **Frontend**: Użyj `apps/web/Dockerfile`
   - **Worker**: Użyj `apps/worker/Dockerfile`

## Metoda 3: Buildpack (opcjonalnie)

Możesz użyć Python buildpack dla prostych aplikacji, ale w tym monorepo zalecany jest Dockerfile per serwis.

## Konfiguracja GitHub Integration (zalecana)
1. Połącz projekt z repozytorium GitHub.
2. Dla każdego serwisu ustaw `Service Path` na `/` (root repo) i właściwy `Dockerfile Path` (`apps/backend/Dockerfile`, `apps/worker/Dockerfile`, `apps/web/Dockerfile`).
3. Ustaw zmienne środowiskowe zgodnie z sekcją poniżej.
4. Włącz auto-deploy na push do gałęzi `master`.

## Pliki konfiguracyjne

- `railway.json` - Główna konfiguracja Railway
- `railway.toml` - Alternatywna konfiguracja TOML
- `railway-*.json` - Różne warianty konfiguracji
- `Dockerfile` - Standardowy Dockerfile dla backendu
- `requirements.txt` - Zależności Python
- `package.json` - Konfiguracja Node.js dla Railway

## Zmienne środowiskowe

Ustaw te zmienne w Railway Dashboard:

```bash
# Backend
DATABASE_URL=postgresql://user:password@host:port/database
REDIS_URL=redis://host:port/database
SECRET_KEY=your-secret-key-here
GAI_PANEL_PASSWORD=your-password-here

# AI Providers (opcjonalnie)
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
DEEPSEEK_API_KEY=sk-your-deepseek-key

# FTP (opcjonalnie)
FTP_HOST=your-ftp-host
FTP_USER=your-ftp-user
FTP_PASS=your-ftp-password
```

## Rozwiązywanie problemów

1. **Błąd Railpack**: Użyj jednej z powyższych metod
2. **Błąd buildu**: Jeśli log mówi `ERROR: COPY packages: not found`, oznacza to, że Service Path nie jest ustawiony na root repo. Ustaw `Service Path: /` i wskaż `apps/*/Dockerfile`.
3. **Błąd startu**: Sprawdź zmienne środowiskowe
4. **Problem z bazą danych**: Upewnij się, że PostgreSQL jest podłączone
5. **Problem z Redis**: Upewnij się, że Redis jest podłączony

## Alternatywne platformy

Jeśli Railway nadal nie działa, rozważ:
- **Vercel** dla frontendu
- **Render** dla backendu
- **Fly.io** dla wszystkich serwisów
- **DigitalOcean App Platform**
- **AWS ECS** z Docker Compose
