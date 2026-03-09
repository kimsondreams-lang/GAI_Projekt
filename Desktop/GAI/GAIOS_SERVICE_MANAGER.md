# GAI OS Service Manager

## Instalacja i używanie systemu GAI OS

### Szybki start

```bash
# Uprawnienia do skryptu
chmod +x scripts/gaios

# Uruchom serwer
./gaios start

# Sprawdź status
./gaios status

# Zatrzymaj serwer
./gaios stop

# Restartuj serwer
./gaios restart

# Pokaż logi
./gaios logs
```

### Komendy

- `./gaios start` - Uruchamia serwer GAI OS na porcie 1234
- `./gaios stop` - Zatrzymuje serwer
- `./gaios restart` - Restartuje serwer
- `./gaios status` - Pokazuje status serwera
- `./gaios logs` - Pokazuje logi serwera

### Automatyczne uruchamianie (macOS)

Aby GAI OS uruchamiał się automatycznie przy starcie systemu:

```bash
# Skopiuj plik LaunchAgent
cp com.gaios.server.plist ~/Library/LaunchAgents/

# Załaduj usługę
launchctl load ~/Library/LaunchAgents/com.gaios.server.plist

# Sprawdź status usługi
launchctl list | grep gaios
```

### Konfiguracja

Serwer działa na `http://localhost:1234` z następującymi endpointami:

- `GET /api/health` - Health check z monitoringiem
- `GET /api/ping` - Prosty ping endpoint
- `POST /api/command` - Główny endpoint AI
- `GET /api/debug` - Debug informacje (tylko w trybie debug)

### Pliki konfiguracyjne

- `.env.local` - Główna konfiguracja środowiska
- `.gaios/backend.pid` - PID procesu backendu
- `.gaios/backend.log` - Logi backendu
- `.gaios/launchd.log` - Logi LaunchAgent

### Rozwiązywanie problemów

Jeśli serwer nie działa:

1. Sprawdź logi: `./gaios logs`
2. Sprawdź czy port 1234 jest wolny: `lsof -i :1234`
3. Sprawdź health check: `curl http://localhost:1234/api/health`
4. Upewnij się że Node.js jest zainstalowany: `node --version`

### Bezpieczeństwo

- Domyślny klucz sesji jest automatycznie generowany
- Rate limiting jest włączony dla wszystkich endpointów
- Walidacja wejść jest włączona dla wszystkich API
- Circuit breaker chroni przed przeciążeniem AI

### Tryb developerski

Aby włączyć tryb debugowania:

```bash
# Uruchom z debug mode
DEBUG_MODE=true ./gaios start

# Lub ustaw w .env.local
DEBUG_MODE=true
VERBOSE_LOGGING=true
```