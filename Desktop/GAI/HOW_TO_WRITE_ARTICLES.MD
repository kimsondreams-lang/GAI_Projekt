# Przewodnik GAI: Tworzenie i Edytowanie Artykułów na Blogu Technologicznym

## UWAGA KRYTYCZNA ⚠️
Ten przewodnik powstał po gruntownym audycie bazy artykułów, podczas którego wykryto liczne błędy związane z nieaktualnymi datami, modelami produktów i wydarzeniami technologicznymi. **KAŻDY ARTYKUŁ MUSI BYĆ WERYFIKOWANY POD KĄTEM AKTUALNOŚCI PRZED PUBLIKACJĄ.**

## 1. ZASADY PODSTAWOWE

### 1. Aktualność Informacji - PRIORYTET #1
- **NIGDY nie używaj przyszłych dat**
- **ZAWSZE sprawdzaj aktualne modele produktów** przed napisaniem artykułu
- **WERYFIKUJ daty premier produktów** w oficjalnych źródłach
- **AKTUALIZUJ informacje o wydarzeniach technologicznych** (CES, Prime Day, itp.)

## 2. STRUKTURA PLIKU ARTYKUŁU JSON

### 2.1 Wymagane Pola
```json
{
  "id": "unikalny-identyfikator-artykulu",
  "title": "Tytuł Artykułu",
  "subtitle": "Podtytuł opisujący treść",
  "author": "Imię Nazwisko",
  "date": "YYYY-MM-DD",
  "category": "REVIEWS|COMPARISONS|NEWS|PROMOTIONS",
  "tags": ["tag1", "tag2", "tag3"],
  "image": "images/articles/nazwa-obrazu.jpg",
  "content": "<p>Treść artykułu w HTML...</p>"
}
```

### 2.2 Sprawdzanie Spójności
- **ID musi odpowiadać tytułowi i treści**
- **Tytuł musi odpowiadać treści artykułu**
- **Data musi być realistyczna** (nie przyszła)
- **Tagi muszą odpowiadać treści**

## 3. PROCES TWORZENIA ARTYKUŁU KROK PO KROKU

### KROK 1: Badanie i Weryfikacja
1. **Sprawdź aktualne informacje o produkcie w internecie**
   - Oficjalne strony producentów
   - Aktualne specyfikacje techniczne
   - Daty premier i dostępności
   - produkt powinien się znajdowac w ofercie amazon
   
2. **Weryfikuj modele produktów**
   - Apple: sprawdź najnowsze modele na apple.com
   - Samsung: sprawdź aktualną linię Galaxy
   - Inne marki: sprawdź oficjalne strony

3. **Sprawdź daty wydarzeń**
   - CES: zawsze styczeń
   - Prime Day: zwykle lipiec
   - Black Friday: listopad
   - Back to School: sierpień-wrzesień
   - Inne wydarzenia

### KROK 2: Planowanie Treści
1. **Określ typ artykułu**
   - REVIEWS: recenzje produktów
   - COMPARISONS: porównania produktów
   - NEWS: aktualności technologiczne
   - PROMOTIONS: promocje i oferty
   - ANNOUNCEMENTS: zapowiedzi produktów
   - PRODUCT RUMORS - plotki co jest tworzone w największych firmach
   - inne typy

2. **Zaplanuj strukturę**
   - Wprowadzenie
   - Sekcje tematyczne (Design, Performance, itp.)
   - Zdjęcia i opisy
   - Podsumowanie/Werdykt
   - Linki affiliate
   - TYLKO JĘZYK ANGIELSKI

### KROK 3: Tworzenie ID i Metadanych

**UWAGA:** Od marca 2026 system posiada automatyczny mechanizm synchronizacji indeksu. Jeśli pracujesz w środowisku deweloperskim, uruchom `npm run watch:articles`, aby `data/articles/index.json` aktualizował się automatycznie po zapisaniu pliku JSON artykułu.
1. **Utwórz unikalny ID**
   ```
   Format: nazwa-produktu-typ-artykulu
   Przykład: iphone-16-pro-max-review
   ```

2. **Ustaw datę**
   ```
   ZAWSZE: Sprawdzaj aktualną datę w internecie
   Format: "YYYY-MM-DD"
   ```

3. **Wybierz odpowiednie tagi**
   - Nazwa marki (Apple, Samsung, Sony)
   - Typ produktu (iPhone, MacBook, Headphones)
   - Kategoria (Review, Comparison)

### KROK 4: Pisanie Treści
1. **Struktura HTML**
   ```html
   <p>Paragraf wprowadzający</p>
   
   <h2>Nagłówek Sekcji</h2>
   <p>Treść sekcji</p>
   
   <div class="article-image-wrapper">
       <img src="images/articles/nazwa.jpg" alt="Opis" class="article-image">
       <p class="image-caption">Podpis obrazu</p>
   </div>
   ```

2. **Linki Amazon (WAŻNE!)**
   ```html
   <a href="https://www.amazon.com/dp/PRODUCT_ID?tag=kimsondreams-21" target="_blank" rel="noopener">Tekst linku</a>
   ```

3. **Sekcja rekomendacji produktów**
   ```html
   <div class="product-recommendation">
       <h3>Where to Buy</h3>
       <p>Opis z linkami Amazon</p>
   </div>
   ```

### KROK 5: Dobór Obrazów
1. **Nazewnictwo plików**
   ```
   Format: nazwa-produktu-typ.jpg
   Przykład: iphone-16-pro-max-main.jpg
   ```

2. **Lokalizacja**
   ```
   Ścieżka: images/articles/nazwa-pliku.jpg
   ```

3. **Wymagania techniczne**
   - obraz musi przedstawiać opisywany produkt
   - Format: JPG lub PNG
   - Rozdzielczość: minimum 800px szerokości
   - Rozmiar: maksymalnie 500KB

## 4. LISTA KONTROLNA PRZED PUBLIKACJĄ

### ✅ Weryfikacja Treści
- [ ] Data artykułu aktualna z internetu
- [ ] Wszystkie modele produktów są aktualne
- [ ] Wydarzenia technologiczne mają poprawne daty
- [ ] Tytuł odpowiada treści artykułu
- [ ] ID artykułu jest unikalny i opisowy

### ✅ Weryfikacja Techniczna
- [ ] Plik JSON ma poprawną składnię
- [ ] Wszystkie wymagane pola są wypełnione
- [ ] **KRYTYCZNE**: Każdy link Amazon został przetestowany ręcznie
- [ ] **KRYTYCZNE**: Wszystkie linki prowadzą do właściwych produktów
- [ ] **KRYTYCZNE**: Brak duplikatów linków dla różnych produktów
- [ ] Linki Amazon zawierają tag affiliate (?tag=kimsondreams-21)
- [ ] Produkty na Amazon są dostępne (nie "Currently unavailable")
- [ ] Obrazy istnieją w folderze images/articles/
- [ ] HTML jest poprawnie sformatowany

### ✅ Weryfikacja SEO
- [ ] Tytuł zawiera główne słowo kluczowe
- [ ] Tagi są relevantne do treści
- [ ] Alt text dla obrazów jest opisowy
- [ ] Linki zewnętrzne mają target="_blank"

## 5. NAJCZĘSTSZE BŁĘDY DO UNIKANIA

### ❌ BŁĘDY KRYTYCZNE
1. **Przyszłe daty** (2026, 2027) - NIGDY JAKO DATA ARTYKUŁU!
2. **Nieaktualne modele Apple** (sprawdzaj najnowsze modele) - SPRAWDZAJ!
3. **Niepoprawne daty wydarzeń** (sprawdzaj oficjalne daty) - WERYFIKUJ!
4. **Niespójność tytuł-treść** - KONTROLUJ!

### ❌ Błędy Techniczne
1. Niepoprawny JSON (brakujące przecinki, cudzysłowy)
2. Nieistniejące ścieżki do obrazów
3. Brakujące tagi affiliate w linkach Amazon
4. Niepoprawne formatowanie HTML

### ❌ Błędy Merytoryczne
1. Nieaktualne specyfikacje produktów
2. Błędne ceny i dostępność
3. Nieweryfikowane informacje techniczne
4. Brakujące źródła dla twierdzeń

## 6. NARZĘDZIA WERYFIKACJI

### 6.1 Sprawdzanie Aktualności
- **Apple**: apple.com - oficjalne specyfikacje
- **Samsung**: samsung.com - aktualne modele
- **Amazon**: amazon.com - ceny i dostępność
- **Tech News**: techcrunch.com, theverge.com

### 6.2 Walidacja JSON
- Użyj walidatora JSON online
- Sprawdź składnię przed zapisem
- Testuj w przeglądarce

### 6.3 Sprawdzanie Linków Amazon - PROCEDURA OBOWIĄZKOWA

#### 🔍 AUDYT LINKÓW PRZED PUBLIKACJĄ
**KAŻDY link Amazon MUSI być sprawdzony przed publikacją artykułu!**

1. **Weryfikacja Dostępności Produktu**
   - Kliknij każdy link Amazon w artykule
   - Sprawdź czy prowadzi do właściwego produktu
   - Upewnij się, że produkt jest dostępny (nie "Currently unavailable")
   - Sprawdź czy cena jest aktualna

2. **Kontrola Poprawności Linków**
   ```
   ✅ POPRAWNY FORMAT:
   https://www.amazon.com/dp/PRODUCT_ID?tag=kimsondreams-21
   
   ❌ BŁĘDNE FORMATY:
   - Linki bez tagu affiliate
   - Linki do konkretnych wariantów (kolor, rozmiar)
   - Linki do nieistniejących produktów
   - Linki prowadzące do złych produktów
   ```

3. **Sprawdzanie Spójności Produkt-Link**
   - **KRYTYCZNE**: Link do iPhone 16 Pro Max NIE MOŻE prowadzić do iPhone 15
   - **KRYTYCZNE**: Link do Sony WH-1000XM5 NIE MOŻE prowadzić do Bose
   - **KRYTYCZNE**: Link do ASUS ROG NIE MOŻE prowadzić do Dell

4. **Procedura Naprawy Błędnych Linków**
   ```
   Jeśli link jest błędny:
   1. Znajdź właściwy produkt na Amazon
   2. Skopiuj ASIN (kod produktu)
   3. Utwórz nowy link: https://www.amazon.com/dp/ASIN?tag=kimsondreams-21
   4. Zamień błędny link na poprawny
   5. Przetestuj nowy link
   ```

5. **Alternatywne Rozwiązanie - Linki Wyszukiwania**
   ```
   Jeśli konkretny produkt nie jest dostępny:
   https://www.amazon.com/s?k=nazwa+produktu&tag=kimsondreams-21
   
   Przykłady:
   - https://www.amazon.com/s?k=iphone+16+pro+max&tag=kimsondreams-21
   - https://www.amazon.com/s?k=sony+wh-1000xm5&tag=kimsondreams-21
   - https://www.amazon.com/s?k=asus+rog+zephyrus+g14&tag=kimsondreams-21
   ```

#### 🚨 NAJCZĘSTSZE BŁĘDY LINKÓW (WYKRYTE W AUDYCIE)

1. **Ten sam link dla różnych produktów**
   - ❌ Trzy różne laptopy z tym samym linkiem Amazon
   - ✅ Każdy produkt ma unikalny, właściwy link

2. **Link prowadzi do złego produktu**
   - ❌ Link "Sony WH-1000XM5" prowadzi do Bose QuietComfort
   - ✅ Link prowadzi dokładnie do opisywanego produktu

3. **Nieaktualne linki produktów**
   - ❌ Link do iPhone 15 w artykule o iPhone 16
   - ✅ Link odpowiada modelowi opisywanemu w artykule

4. **Brakujące tagi affiliate**
   - ❌ https://www.amazon.com/dp/B0C6J8JQ6K
   - ✅ https://www.amazon.com/dp/B0C6J8JQ6K?tag=kimsondreams-21

#### 📋 LISTA KONTROLNA LINKÓW AMAZON

**Przed publikacją artykułu sprawdź:**
- [ ] Każdy link Amazon został przetestowany
- [ ] Wszystkie linki prowadzą do właściwych produktów
- [ ] Produkty są dostępne na Amazon
- [ ] Wszystkie linki zawierają tag affiliate
- [ ] Nie ma duplikatów linków dla różnych produktów
- [ ] Ceny produktów są aktualne
- [ ] Linki nie prowadzą do błędnych wariantów produktu

#### 🔧 NARZĘDZIA DO SPRAWDZANIA LINKÓW

1. **Ręczne testowanie**
   - Otwórz każdy link w nowej karcie
   - Sprawdź czy to właściwy produkt
   - Zweryfikuj dostępność

2. **Sprawdzanie ASIN**
   ```
   ASIN to unikalny kod produktu Amazon
   Format: B0XXXXXXXXX (10 znaków)
   Znajdziesz go w URL produktu
   ```

3. **Weryfikacja tagów affiliate**
   ```
   Każdy link MUSI zawierać: ?tag=kimsondreams-21
   Sprawdź na końcu każdego URL
   ```

#### ⚠️ PROCEDURA AWARYJNA DLA BŁĘDNYCH LINKÓW

**Jeśli wykryjesz błędny link w opublikowanym artykule:**

1. **NATYCHMIAST** oznacz artykuł do poprawy
2. Znajdź wszystkie błędne linki w artykule
3. Wyszukaj właściwe produkty na Amazon
4. Zamień błędne linki na poprawne
5. Przetestuj wszystkie nowe linki
6. Zapisz poprawiony artykuł
7. Przeprowadź pełny audyt pozostałych linków w artykule

**PAMIĘTAJ**: Błędne linki Amazon to utrata potencjalnych prowizji i zaufania czytelników!

## 7. PRZYKŁAD POPRAWNEGO ARTYKUŁU

```json
{
  "id": "iphone-16-pro-max-review",
  "title": "iPhone 16 Pro Max Review: Apple's Latest Flagship Smartphone",
  "subtitle": "A comprehensive review of Apple's most advanced iPhone yet",
  "author": "John Smith",
  "date": "2025-01-15",
  "category": "REVIEWS",
  "tags": ["Apple", "iPhone 16 Pro Max", "Smartphone", "Review"],
  "image": "images/articles/iphone-16-pro-max-main.jpg",
  "content": "<p>Apple's iPhone 16 Pro Max represents the pinnacle of smartphone technology in 2025...</p>"
}
```

## 8. PROCEDURA AWARYJNA

Jeśli wykryjesz błąd w opublikowanym artykule:

1. **NATYCHMIAST zatrzymaj publikację**
2. **Zidentyfikuj typ błędu** (data, model, treść)
3. **Popraw błąd** zgodnie z tym przewodnikiem
4. **Przeprowadź pełną weryfikację** artykułu
5. **Przetestuj poprawki** przed ponowną publikacją

## 9. SPECJALNE INSTRUKCJE DLA RÓŻNYCH TYPÓW ARTYKUŁÓW

### 9.1 Recenzje Produktów (REVIEWS)
- **Zawsze sprawdź najnowszą wersję produktu**
- **Weryfikuj specyfikacje techniczne**
- **Sprawdź aktualną cenę na Amazon**
- **Dodaj sekcję "Where to Buy" z linkami affiliate**

### 9.2 Porównania (COMPARISONS)
- **Upewnij się, że porównujesz aktualne modele**
- **Sprawdź daty premier wszystkich produktów**
- **Weryfikuj dostępność na rynku**
- **Dodaj tabelę porównawczą**

### 9.3 Aktualności (NEWS)
- **Sprawdź datę wydarzenia/ogłoszenia**
- **Weryfikuj informacje w oficjalnych źródłach**
- **Nie używaj przyszłych dat**
- **Dodaj źródła informacji**

### 9.4 Promocje (PROMOTIONS)
- **Sprawdź aktualność promocji**
- **Weryfikuj daty trwania ofert**
- **Testuj linki do produktów**
- **Dodaj informację o ograniczeniach czasowych**

## 10. WORKFLOW KONTROLI JAKOŚCI

### Przed Rozpoczęciem Pisania:
1. Sprawdź aktualne informacje o produkcie
2. Weryfikuj modele i specyfikacje
3. Sprawdź konkurencyjne artykuły
4. Zaplanuj strukturę artykułu

### Podczas Pisania:
1. Używaj aktualnych dat i informacji
2. Sprawdzaj każdy fakt przed dodaniem
3. Weryfikuj linki Amazon
4. Dodawaj odpowiednie obrazy
5. PISZ W TAKIEJ FORMIE JAKBY PISAŁ TO CZŁOWIEK. DODAWAJ OSOBISTE PRZEMYŚLENIA ITP

### Po Napisaniu:
1. Sprawdź składnię JSON
2. Weryfikuj wszystkie linki
3. Testuj wyświetlanie artykułu
4. Przeprowadź końcową kontrolę faktów

## PODSUMOWANIE

**PAMIĘTAJ**: Każdy artykuł to reprezentacja marki. Błędy w datach, modelach produktów czy wydarzeniach technologicznych podważają wiarygodność całego bloga. **ZAWSZE weryfikuj informacje przed publikacją!**

---

## SPECYFIKACJA TECHNICZNA PLIKU JSON (ARTYKUŁ)

- Plik: umieść w `articles/`, nazwa w formacie `slug.json` (np. `iphone-16-pro-max-review.json`).
- Kodowanie: UTF‑8. Zawartość w pełni poprawny JSON.
- Pola wymagane:
  - `id`: unikalny identyfikator (slug), np. `iphone-16-pro-max-review`.
  - `title`: tytuł artykułu.
  - `author`: autor (np. `Technova Team`).
  - `date`: data publikacji w formacie `YYYY-MM-DD`.
  - `category`: typ artykułu. Dozwolone wartości: `NEWS`, `REVIEWS`, `COMPARISONS`, `PROMOTIONS`, `ANNOUNCEMENTS`.
  - `content`: treść HTML (sekcje, akapity, linki). Bez skryptów.
- Pola opcjonalne, zalecane:
  - `subtitle`: krótki opis.
  - `image`: URL głównego obrazu (lokalnie używaj `images/articles/...`).
  - `tags`: lista tematów, służy do filtrowania w menu tematycznym. Rekomendowane tematy: `Tech`, `AI`, `Gaming`, `Audio`, `Productivity`, `Dev`, `Smart Home`, `Accessories`, `Hardware`, `Science`.
  - `gallery`: lista obiektów `{ src, alt, caption }` dla dodatkowych zdjęć.
  - `affiliateLinks`: lista obiektów `{ label, url }` z poprawnym tagiem Amazon.

### Minimalny przykład

```
{
  "id": "iphone-16-pro-max-review",
  "title": "iPhone 16 Pro Max Review",
  "author": "Technova Team",
  "date": "2024-11-02",
  "category": "REVIEWS",
  "tags": ["Tech", "Apple", "Smartphone"],
  "image": "images/articles/iphone-16-pro-max.jpg",
  "content": "<p>Full long-form review content...</p>",
  "gallery": [
    { "src": "images/articles/iphone-16-pro-max-1.jpg", "alt": "Back panel", "caption": "Matte finish" }
  ]
}
```

### Zasady walidacji

- `category` wpływa na pierwszy rząd filtrów (NEWS/REVIEWS/PROMOTIONS/itd.).
- `tags` wpływają na drugi rząd filtrów (tematy). Aby artykuł był widoczny po kliknięciu `TECH`, dodaj w `tags` co najmniej jeden z synonimów: `Tech`, `Technology`, `Gadgets`, `Devices`. Analogicznie dla `AI`, `Gaming`, `Audio`, `Productivity`, `Dev`, `Smart Home`, `Accessories`, `Hardware`, `Science`.
- Obrazy lokalne trzymaj w `images/articles/`. Używaj rozsądnych rozmiarów i proporcji.
- Treść `content` musi być bogata, z pełnymi akapitami, bez skrótów i bez skryptów.

### Kluczowe Zasady:
1. **Aktualność przede wszystkim** - żadnych przyszłych dat
2. **Weryfikacja faktów** - sprawdzaj każdą informację
3. **Spójność treści** - tytuł musi odpowiadać zawartości
4. **Poprawność techniczna** - testuj JSON i linki
5. **SEO i UX** - dbaj o jakość treści dla użytkowników

---

*Ten przewodnik został zaktualizowany w styczniu 2025. Przestrzeganie tych wytycznych jest OBOWIĄZKOWE.*
