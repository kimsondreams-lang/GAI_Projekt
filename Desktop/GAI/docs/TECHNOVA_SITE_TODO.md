# TechNova — TODO / pomysły na przyszłość

Ten plik zbiera pomysły i elementy do dopracowania strony TechNova (część statyczna na FTP) oraz integracji z lokalnym GAI OS jako panelem administracyjnym.

## Stan na dziś (wdrożone lokalnie)

- Sekcja Featured (hero + 3 mini-karty) na podstawie najnowszych artykułów (sort po `date`).
- Karty w sidebarze: Newsletter / Support.
- Modal dla przycisków „Subscribe” i „Send us a Tip!” (tymczasowo informacyjny + mailto).
- Podstawowe meta: canonical + twitter/og image (wymaga dodania realnego pliku `images/og-cover.png` na hostingu, jeśli jeszcze go nie ma).
- Aplikacja w GAI OS: **Site Manager** (backup z FTP + eksport lokalnego bundla).

Pliki strony (lokalnie): `temp_ftp_blog/*`

## Priorytet: UI/UX (żeby strona nie była „pusta”)

- Dodać sekcję „Trending / Most read” (wymaga sygnału popularności: analytics lub prosty licznik klików).
- Dodać „Popular topics” (top kategorii/tagów) i linki nawigacyjne.
- Dodać stronę/sekcję „About TechNova” + social links (X/YouTube/Telegram).
- Dodać „Editor’s pick” / „Recommended gear” (karty z produktami) — spójne z afiliacją.
- Dodać „Related articles” na widoku pojedynczego artykułu (np. po kategorii/tagach).
- Poprawić search UX: dropdown wyników + podświetlenie trafień.

## SEO / social / techniczne

- Dodać structured data (JSON-LD): `Blog`, `BlogPosting` na widoku artykułu.
- Ujednolicić OG/Twitter: generować `og:image` per-artykuł (jeśli jest cover) lub fallback.
- Dodać `sitemap.xml` i `robots.txt` (jeśli hosting pozwala) + automatyczny generator w GAI OS.
- Dodać poprawny `404.html` (friendly error, link do strony głównej).
- Dodać „skip to content”, poprawić a11y (aria-labels, focus states, kontrast).

## Subscribe — plan (do przegadania, NIE wdrożone)

Cel: lokalny panel w GAI OS do obsługi listy, ale trzeba ustalić jak zbierać zapisy z publicznej strony.

Warianty do rozważenia:
- Zewnętrzny provider newsletter (MailerLite/Substack/etc.) + w GAI OS tylko panel/embedding linków i statystyk (manual import).
- Własny backend publiczny (oddzielny od GAI OS) + GAI OS jako klient do zarządzania (najwięcej kontroli).
- Hybryda: formularz na stronie wysyła maila (mailto) / webhook do providerów (minimum infrastruktury).

## Tip jar — plan (do przegadania, NIE wdrożone)

- Minimalnie: modal z linkami (PayPal.me / Stripe Payment Link / BuyMeACoffee / crypto) + tracking kliknięć.
- Pełna integracja: Stripe Checkout + webhook + rejestr tipów (wymaga publicznego endpointu i sekretów po stronie serwera).

## Analytics — plan (do przegadania, NIE wdrożone)

GAI OS ma pozostać lokalny, więc do realnego „jak GA” trzeba ustalić zbieranie danych z publicznej strony.

Opcje:
- First‑party collector hostowany publicznie (np. Cloudflare Worker) + panel (wizualizacja) w GAI OS.
- Minimalny licznik: statyczne pixel-beacon do zewnętrznego endpointu + import do GAI OS.

Eventy do trackingu:
- page_view, article_open, search, click_subscribe, click_tip, outbound_affiliate_click.

## Operacyjne / publikacja

- Dodać w Site Manager: wybór profilu „Remote path” (presety) i przycisk „Upload bundle” (z ostrożnym dry-run).
- Dodać prosty diff pomiędzy backupami (lista plików + hash).
- Ustandaryzować wersjonowanie plików JS/CSS (cache busting) przy publikacji.

