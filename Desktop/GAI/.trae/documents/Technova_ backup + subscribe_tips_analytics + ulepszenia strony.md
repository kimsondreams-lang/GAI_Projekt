## Co już widzę w kodzie strony
- Strona jest statyczna (HTML/CSS/JS) i ładuje artykuły z `data/articles/index.json`, a następnie sortuje je po dacie malejąco w JS ([main.js](file:///Users/jakubnetza/Desktop/GAI/temp_ftp_blog/js/main.js#L51-L60)).
- Przyciski „Subscribe” i „Send us a Tip!” są w HTML ([index.html](file:///Users/jakubnetza/Desktop/GAI/temp_ftp_blog/index.html#L39-L48)), ale w aktualnym JS nie widzę żadnych handlerów kliknięcia — czyli prawdopodobnie dziś nic nie robią.
- W projekcie GAI OS jest już gotowy mechanizm pobierania całych katalogów z FTP (`POST /api/ftp/download` używa `downloadToDir`) ([server.js](file:///Users/jakubnetza/Desktop/GAI/server.js#L5200-L5216)) oraz aplikacja FTP Client.

## Kluczowa uwaga architektoniczna (żeby to działało w produkcji)
- Subskrypcje / tipy / analytics wymagają endpointu HTTP, do którego strona (hostowana na FTP) może wysyłać requesty.
- Najprościej: uruchomić backend GAI OS na serwerze publicznym pod subdomeną np. `https://api.technova.buzz` (lub na tym samym hostingu jeśli pozwala na Node). Wtedy strona z FTP wysyła `fetch`/`sendBeacon` do tego API.
- Jeśli hosting nie pozwala na Node, alternatywa: lekki endpoint serverless (np. Cloudflare Worker) jako „collector”, a GAI OS jako panel do przeglądu/importu danych. W planie założę wariant preferowany: API na Node (GAI OS backend).

## Plan prac

## 1) Backup strony z FTP (wersjonowanie)
- Dodam w GAI OS „one-click backup” dla katalogu strony z FTP:
  - wybór z UI: remotePath (np. `/public_html/`) i lokalny katalog backupu `data/out/site_backups/<timestamp>/`.
  - użycie istniejącego endpointu `/api/ftp/download` (isDirectory=true) + zapis metadanych (kiedy, skąd, jaka ścieżka).
  - opcjonalnie: spakowanie backupu do `.zip`/`.tar.gz` i zapis w `data/out/`.
- Dodam nową aplikację w GAI OS: „Site Manager” (lista backupów, przycisk „Backup now”, otwieranie w File Manager, szybki diff vs poprzedni backup).

## 2) Audyt UX/UI strony (żeby nie była „pusta”)
- Zaproponuję i wdrożę lekkie ulepszenia bez przebudowy całego layoutu:
  - sekcja „Featured article” (1 duża karta + 2–3 mniejsze) nad listą,
  - blok „Newsletter” w treści (CTA) + „Tip jar” w stopce,
  - „Popular topics”/„Trending” (top wg odsłon z analytics),
  - „About TechNova” + linki social,
  - poprawki SEO: canonical, structured data (Article/BlogPosting), lepsze OG/Twitter cards.

## 3) Subscribe: system subskrypcji + aplikacja w GAI OS
- Backend (GAI OS):
  - endpointy: `POST /api/subscriptions/subscribe`, `POST /api/subscriptions/unsubscribe`, `GET /api/subscriptions/export`.
  - zapis do DB: email (hash + plaintext opcjonalnie), status, źródło, data, tags.
  - ochrona: rate-limit, walidacja email, blokady anty-spam (honeypot, minimalny czas, proste IP throttling).
- Frontend (strona):
  - modal po kliknięciu „Subscribe” + embedowany formularz.
  - opcja: checkbox GDPR/consent.
- Aplikacja w GAI OS: „Subscribers”
  - lista/subskrybenci, tagowanie, eksport CSV, import, podstawowe statystyki.
- Wariant rozszerzony (opcjonalny): wysyłka maili/newsletter z GAI OS przez SMTP (jeśli chcesz) — wymaga konfiguracji SMTP.

## 4) Tipowanie: system tipów + aplikacja w GAI OS
- Wariant minimalny (bez sekretów, na start):
  - konfiguracja w GAI OS linków do płatności (PayPal.me / BuyMeACoffee / Stripe Payment Link / crypto adresy),
  - strona pokazuje modal z opcjami + trackuje kliknięcia jako eventy analytics.
- Wariant pełny (prawdziwe płatności + rejestr tipów):
  - integracja Stripe Checkout (create session + webhook) i panel tipów w GAI OS.
  - sekrety trzymane w env na serwerze (nie w UI), w UI tylko publishable key i teksty.

## 5) Analytics „jak GA” (first‑party, privacy‑friendly) + aplikacja w GAI OS
- Collector:
  - `POST /api/analytics/collect` (pageview/event) i/lub `GET /api/analytics/pixel.gif?...` (fallback).
  - unikalni: visitorId z localStorage + sessionId; dodatkowo serwerowy fingerprint (hash IP+UA z solą) do anty-duplikacji.
  - agregacja dzienna: uniques, pageviews, top pages, referrers, device.
- Frontend (strona):
  - mały skrypt `analytics.js` używający `navigator.sendBeacon`.
  - tracking: page view, kliknięcia w „Subscribe” i „Tip”, otwarcia artykułów.
- Aplikacja w GAI OS: „Analytics”
  - wykresy dzienne, top artykuły, źródła ruchu, podgląd real-time (opcjonalnie).

## 6) Weryfikacja i wdrożenie
- Lokalnie: testy manualne, walidacja CORS, rate-limit, poprawność zapisu DB.
- Na stronie: sprawdzenie, że modale działają i eventy lecą.
- Publikacja na FTP: upload zmienionych plików strony + (jeśli potrzeba) konfiguracja `API_BASE_URL` w jednym miejscu.

Jeśli potwierdzisz ten plan, zacznę od: (1) zrobienia automatycznego backupu przez FTP (w GAI OS), (2) podpięcia modali Subscribe/Tip na stronie, (3) wdrożenia analytics collect + panelu w GAI OS.