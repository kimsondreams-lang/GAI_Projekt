# GAI OS - General Autonomous Intelligence (GAIOS)

**GAIOS** to autonomiczny system operacyjny typu "Builder" zintegrowany z lokalnymi modelami AI. Nie jest to chatbot, lecz narzędzie wykonawcze zdolne do modyfikowania swojego kodu, zarządzania plikami, tworzenia treści i wchodzenia w interakcje ze światem zewnętrznym.

## Kluczowe Cechy i Możliwości (Aktualizacja: Luty 2026)

### 1. Autonomiczna Pętla Wykonawcza (Kernel)
System działa w pętli **Myśl (Thought) -> Działanie (Action) -> Obserwacja (Observation)**.
- **Zarządzanie Zadaniami:** GAI posiada własną listę zadań (`Task Manager`) i potrafi dzielić duże cele na podzadania.
- **Samonaprawa:** Monitoruje swoje procesy (Heartbeat, Watchdog) i potrafi zrestartować zablokowane akcje.
- **Pamięć Długoterminowa:** Przechowuje fakty, preferencje użytkownika i historię projektów w bazie plikowej (`SYSTEM_DB`).

### 2. "Power-Ups" - Nowe Zmysły i Narzędzia
System został rozbudowany o potężne moduły analityczne i kreatywne:

*   **👁️ Vision (Wzrok):**
    *   **Analiza Plików:** GAI potrafi "patrzeć" na przesłane zdjęcia (np. screenshoty błędów, zdjęcia produktów) i dokładnie je opisywać, używając lokalnego modelu `llava`.
    *   **Auto-Vision w Przeglądarce:** Podczas przeglądania stron WWW (przez Puppeteer), agent może wykonać zrzut ekranu i przeanalizować układ strony, zamiast polegać tylko na tekście HTML.

*   **🐍 Code Interpreter (Python):**
    *   Wbudowane środowisko uruchomieniowe Pythona.
    *   Agent może pisać, testować i uruchamiać skrypty "w locie" do obliczeń, analizy danych, przetwarzania tekstu czy generowania wykresów.

*   **🎨 Remix & Image Generation (Kreatywność):**
    *   **Generowanie:** Tworzenie obrazów na żądanie (komenda `/image`) przy użyciu Pollinations.ai.
    *   **Remix (Image-to-Image):** Unikalna funkcja pozwalająca na "przerysowanie" istniejącego zdjęcia. GAI analizuje obraz źródłowy (np. zdjęcie nowego telefonu z przecieku), tworzy jego opis techniczny, a następnie generuje nową grafikę w wysokiej jakości na podstawie tego opisu (komenda `/remix` lub automatycznie w Blogu).

*   **🌐 Przeglądarka (Puppeteer):**
    *   Pełna, headless przeglądarka Chrome sterowana przez agenta.
    *   Umożliwia obsługę nowoczesnych stron SPA (React/Vue), robienie screenshotów i ekstrakcję treści dynamicznych.

*   **🗣️ Głos (TTS):**
    *   Synteza mowy (Text-to-Speech) pozwalająca agentowi na komunikaty głosowe (np. powiadomienie o sukcesie).

### 3. Automatyzacja Bloga (`BlogHealer`)
Autonomiczny moduł "uzdrowiciela" treści:
- **Auto-Index Watcher:** System monitoruje folder `data/articles/` i automatycznie aktualizuje `index.json` przy każdej zmianie (dodanie, edycja, usunięcie artykułu). Uruchamiane przez `npm run watch:articles`.
Autonomiczny moduł "uzdrowiciela" treści:
- **Auto-Fix:** Samodzielnie skanuje artykuły, wykrywa brakujące lub uszkodzone zdjęcia.
- **Real Object Strategy:** Jeśli brakuje zdjęcia produktu (np. "iPhone 17"), agent:
    1.  Wyszukuje prawdziwe zdjęcie w DuckDuckGo.
    2.  Analizuje je modelem Vision.
    3.  Generuje (remixuje) nową, unikalną grafikę pasującą do stylu bloga.
- **Publikacja:** Automatycznie wysyła naprawione pliki na serwer produkcyjny przez FTP.

### 4. Interfejs Użytkownika (TerminalApp)
- **Hybrydowy UI:** Połączenie czatu z terminalem poleceń.
- **Streamowanie Myśli:** Użytkownik widzi proces decyzyjny agenta (blok `<think>`) oddzielnie od odpowiedzi.
- **Wizualizacja:** Renderowanie obrazów, Markdown i bloków kodu bezpośrednio w strumieniu wiadomości.

## Architektura Techniczna

- **Backend:** Node.js + Express (Centralny Kernel).
- **Frontend:** React + Vite + Tailwind (Neumorphic Design).
- **AI Brain:** Ollama (Lokalne modele: `qwen2.5-coder` do kodu, `llava` do wizji, `deepseek-r1` do planowania).
- **Storage:** Pliki JSON (`/data`) montowane jako wolumen (Cloud Storage FUSE w chmurze lub lokalny dysk).

## Dla Developerów (Rozszerzanie Systemu)

Aby dodać nowe możliwości:
1.  **Narzędzia:** Zdefiniuj nowe narzędzie w `executeTools` w `server.js`.
2.  **Prompt:** Zaktualizuj `autonomous_prompt.txt`, aby agent wiedział, jak używać nowego narzędzia.
3.  **Frontend:** Jeśli narzędzie zwraca specyficzne dane (np. obraz), obsłuż je w `TerminalApp.tsx`.
\n\n## File Creation Methods\n\n- Base64 encoding works for complex JS files (avoids JSON escaping issues)\n- Use: echo \"base64_content\" | base64 -d > output.js\n- Alternative: node -e with proper escaping for simple files
\n## Loop Breaker Update (2026-03-01)\n- Increased loop detection threshold to 25 actions/60s in .gaios/loop_config.json to prevent false positives during high-frequency task updates.\n- Verified system resilience with successful tool execution after configuration change.
