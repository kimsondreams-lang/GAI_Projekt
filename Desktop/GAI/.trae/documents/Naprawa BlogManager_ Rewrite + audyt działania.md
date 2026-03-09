## Diagnoza
- Sprawdzę ścieżkę „Rewrite Article” w [BlogManager.tsx](file:///Users/jakubnetza/Desktop/GAI/components/apps/BlogManager.tsx) (obecnie robi to `generateBlogPost(...)`, czyli regeneruje artykuł zamiast przepisać istniejący HTML).
- Sprawdzę ścieżkę „Rewrite Selection” (obecnie robi `editorContent.replace(selection, rewritten)` – to często jest no-op w trybie visual, bo zaznaczony tekst z DOM nie jest identycznym substringiem HTML).
- Zweryfikuję, czy odpowiedzi AI nie są kasowane przez `stripThinkTags()` w backendzie (jeśli model zawija cały output w `<think>`, to klient dostaje pusty string i „nic się nie dzieje” albo znika treść).

## Naprawa „Rewrite Article”
- Zamiast regenerować artykuł od zera, dodam dedykowaną ścieżkę „Rewrite full article”:
  - prompt będzie zawierał aktualny HTML (z sensownym limitem/trimem) + instrukcję,
  - poproszę model o zwrócenie wyłącznie HTML (bez `<think>`, bez markdown).
- Dodam zabezpieczenie w UI: jeśli wynik jest pusty / za krótki / nie wygląda jak HTML, nie nadpisuję edytora i pokazuję błąd.

## Naprawa „Rewrite Selection” (żeby faktycznie działało)
- W trybie `source`: będę używać indeksów zaznaczenia z textarea (`selectionStart/End`) zamiast dopasowania po stringu.
- W trybie `visual`: dodam tryb „Rewrite selection by marker”:
  - wstawiam tymczasowy unikalny marker wokół zaznaczonego tekstu (lub używam Range do wyciągnięcia HTML fragmentu),
  - podmieniam fragment deterministycznie po markerze.
- Dodam komunikat, jeśli podmiana nie zmieniła treści (no-op), żeby było jasne, że dopasowanie nie zadziałało.

## Fix w backendzie (żeby AI nie zwracało pustych odpowiedzi)
- Zmienią `stripThinkTags()` tak, aby:
  - standardowo usuwał myśli,
  - ale gdy po usunięciu wychodzi pusty output, to „odzyskiwał” treść z wnętrza `<think>` (usuwa tagi, zostawia content).

## Audyt BlogManager (smoke-test funkcji)
- Przejdę po kluczowych flow: listowanie artykułów, otwieranie, zapis, toggle visibility, generacja nowego, rewrite selection/full, generowanie obrazów (AI/Pexels), zapisywanie obrazów do FTP, auto-fix images (global i per-plik).
- Dodam minimalne logowanie/obsługę błędów tam, gdzie teraz brak widocznego feedbacku (np. gdy request wraca pusty string).

## Weryfikacja
- Uruchomię typecheck + build.
- Zrobię szybki test ręczny w UI: rewrite selection w source i visual oraz rewrite full article na realnym artykule.

Jeśli potwierdzisz, wdrożę powyższe zmiany w kodzie.