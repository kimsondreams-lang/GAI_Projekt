# Projekt stron (desktop-first) – GAIOS ulepszenia

## Global Styles (tokens)
- Tło: `--bg-0: #0b0f14`, panele: `--bg-1: #111826`, obrysy: `--border: rgba(255,255,255,.08)`
- Tekst: `--text-0: rgba(255,255,255,.92)`, drugorzędny: `--text-1: rgba(255,255,255,.70)`
- Akcent: `--accent: var(--theme-accent, #6ee7ff)` (podmieniany przez motyw)
- Typografia: 14/16/18/24/32 (skala), domyślnie 16
- Przyciski: primary (accent), secondary (bg-1), disabled (opacity 0.5)
- Linki: podkreślenie w hover, focus ring `2px` w kolorze akcentu
- Animacje: krótkie (120–180ms) dla hover/focus; możliwość wyłączenia w Ustawieniach
- Zawijanie tekstu (global):
  - domyślnie `overflow-wrap: anywhere; word-break: normal;`
  - dla długich tytułów: opcja „zawijaj” lub „ucinaj z wielokropkiem”

---

## 1) Pulpit (Home)
### Layout
- Hybryda: górny pasek (sticky), środek jako „canvas” okien (positioning + flex), dół dock (sticky).
- Siatka marginesów 8px; spacing 16/24/32 dla sekcji.

### Meta Information
- Title: `GAIOS — Pulpit`
- Description: `Pulpit GAIOS z aplikacjami i szybkim dostępem do ustawień.`
- Open Graph: tytuł jak wyżej, obraz: screenshot motywu (fallback).

### Page Structure
1. Top Bar (menubar)
2. Obszar okien aplikacji
3. Dock / Launcher
4. Panel powiadomień (wysuwany)

### Sections & Components
- Top Bar
  - Lewo: logo/nazwa systemu
  - Środek: wyszukiwarka aplikacji (opcjonalnie)
  - Prawo: ikony: motyw, dźwięk, ustawienia
- Dock
  - Ikony aplikacji + tooltip; aktywna aplikacja ma „pill indicator”
- Okna aplikacji
  - Pasek tytułu: nazwa + akcje (min/close)
  - Treść: scroll container, standardowe paddingi
  - Zawijanie tekstu: długie napisy nigdy nie łamią layoutu; tytuły okien zawijane do 2 linii lub elipsa wg ustawienia
- Stany
  - Focused window: wyraźniejszy border/shadow
  - Error toast: zwięzły komunikat + „Spróbuj ponownie”

---

## 2) Ustawienia systemu
### Layout
- Dwukolumnowo: lewy sidebar (kategorie), prawa kolumna (formularze/sekcje).
- Sekcje jako karty (card stack) z nagłówkiem i opisem.

### Meta Information
- Title: `GAIOS — Ustawienia`
- Description: `Motywy, dźwięki i ustawienia czytelności.`
- Open Graph: j.w.

### Page Structure
- Sidebar: Wygląd, Dźwięki, Tekst i czytelność, System
- Content: panel ustawień wybranej kategorii

### Sections & Components
- Wygląd → Motywy
  - Grid motywów (karty): nazwa, podgląd kolorów, przycisk „Zastosuj”
  - Panel „Aktywny motyw”: potwierdzenie + przycisk „Cofnij”
- Dźwięki
  - Lista zdarzeń (np. klik, powiadomienie, błąd) z toggle on/off
  - Wybór paczki dźwięków (select) + przycisk „Odsłuchaj”
  - Suwak głośności + mute
- Tekst i czytelność
  - Suwak rozmiaru UI/tekstu
  - Radio: „Zawijaj” vs „Ucinaj (… )” dla długich etykiet
  - Podgląd (mini-karta i mini-okno) pokazujący łamanie długich słów/URL
- System
  - Toggle: animacje (on/off)
  - Toggle: powiadomienia (on/off)
  - Przycisk: „Przywróć domyślne” (z potwierdzeniem)

---

## 3) Blog
### Layout
- Widok aplikacji: top sub-nav w ramach okna/strony; główna treść w kolumnie z maks. szerokością (np. 920px).
- Edytor: 2 tryby: „Edytuj” i „Podgląd” (tabs).

### Meta Information
- Title: `GAIOS — Blog`
- Description: `Wpisy i edytor WYSIWYG.`
- Open Graph: tytuł wpisu + cover image (jeśli istnieje).

### Page Structure
1. Lista wpisów (z akcją „Nowy wpis”)
2. Szczegóły wpisu
3. Edytor WYSIWYG (nowy/edycja)

### Sections & Components
- Lista wpisów
  - Toolbar: „Nowy wpis”, filtr statusu (draft/published)
  - Lista: tytuł, status, data, akcje (Otwórz / Edytuj)
  - Zawijanie tytułów: max 2–3 linie, reszta elipsa wg ustawień czytelności
- Szczegóły wpisu
  - Nagłówek: tytuł + meta (data/status)
  - Treść: render WYSIWYG (czytelne odstępy, szerokość kolumny)
- Edytor WYSIWYG
  - Pasek narzędzi: H1/H2, bold/italic, lista, link, wstaw obraz
  - Obszar edycji: blokowy, z placeholderami
  - Prawy panel (opcjonalnie): tytuł, slug, status, cover image
  - Akcje: Zapisz szkic, Podgląd, Publikuj
  - Stany: autosave (subtelny status), konflikt/ błąd zapisu (banner + retry)

## Responsywność (minimum)
- Desktop-first: pełne sidebary i dock.
- Tablet: sidebar w Ustawieniach jako drawer; dock zwężony.
- Mobile: opcjonalnie ograniczony layout (karty w jednej kolumnie), bez skomplikowanego zarządzania oknami (degradacja UX, ale czytelność zachowana).