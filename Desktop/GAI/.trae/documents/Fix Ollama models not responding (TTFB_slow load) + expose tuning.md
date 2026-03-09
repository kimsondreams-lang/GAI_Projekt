## Diagnoza (co najpewniej się dzieje)
- W trybie stream masz twardy timeout na „pierwszy token” (TTFB) = 60s. Duże modele (np. qwen3:14b/30b, deepseek-r1:32b) potrafią ładować się >60s na CPU albo przy braku VRAM → request jest abortowany i wygląda jak „model nie działa”.
- Po kilku takich abortach wchodzi circuit breaker i kolejne próby są chwilowo blokowane, co dodatkowo wygląda jak „nic nie trybi”.

## Co sprawdzę (read-only → potem zmiany)
- Przejrzę logi backendu pod kątem abort/timeout/TTFB oraz błędów runnera Ollamy (np. brak RAM/VRAM).
- Zweryfikuję, jak ustawienia modelRoles/modelRolesCtx i warmup wpływają na czas pierwszego tokena.

## Implementacja (po akceptacji)
1) **Uelastycznić TTFB**
- Dodać do ustawień `ollamaTtfbTimeoutMs` (domyślnie np. 180000–300000 ms).
- Użyć tej wartości w `streamOllamaChat` zamiast stałego 60s.
- Pliki: server.js (streamOllamaChat), types.ts (SystemSettings), SettingsApp.tsx (UI).

2) **Lepszy fallback kiedy model jest wolny**
- Jeśli stream padnie przez TTFB (brak tokena), spróbować 1 raz:
  - albo ponowić stream z dłuższym TTFB,
  - albo wykonać non-stream (bez TTFB) dla tego samego modelu.
- Dodać czytelny log do taska: „Model wolny / cold start / zwiększ TTFB”.

3) **Warmup pod realne role**
- Opcjonalnie: warmup modeli używanych w `modelRoles` (lub aktywnego modelu + role) przy starcie, żeby pierwszy token pojawiał się szybciej.

4) **UX w Settings → AI**
- Dodać suwak/field „TTFB timeout (s)” + krótkie wytłumaczenie „na CPU duże modele potrzebują 1–5 min na pierwszy token”.

## Weryfikacja
- Przetestuję na 2–3 modelach: qwen3:latest (kontrola), qwen3:14b (wolniejszy), deepseek-r1:32b (najcięższy).
- Potwierdzę w logach brak abortów TTFB i że zadania nie przechodzą w idle tylko robią postęp.

Jeśli potwierdzisz, wdrażam powyższe zmiany w kodzie.