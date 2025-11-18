#!/bin/bash

# Deployment skrypt dla GAI Agent Frontend

echo "🚀 Rozpoczynam deployment frontendu GAI Agent..."

# Sprawdź czy jesteśmy w głównym katalogu projektu
if [ ! -f "apps/web/package.json" ]; then
    echo "❌ Błąd: Nie znaleziono apps/web/package.json"
    echo "Upewnij się że jesteś w głównym katalogu projektu"
    exit 1
fi

# Sprawdź Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Błąd: Node.js nie jest zainstalowany"
    exit 1
fi

# Sprawdź npm
if ! command -v npm &> /dev/null; then
    echo "❌ Błąd: npm nie jest zainstalowany"
    exit 1
fi

# Przejdź do katalogu frontendu
cd apps/web

echo "📦 Instalowanie zależności..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Błąd podczas instalacji zależności"
    exit 1
fi

echo "🔧 Buildowanie aplikacji..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Błąd podczas buildowania aplikacji"
    exit 1
fi

echo "✅ Build zakończony sukcesem!"

# Opcjonalnie: uruchom lokalny serwer
echo "🌐 Uruchamianie lokalnego serwera..."
echo "Aplikacja będzie dostępna na: http://localhost:3000"

npm start &
FRONTEND_PID=$!

echo "✅ Frontend uruchomiony!"
echo "PID: $FRONTEND_PID"
echo "URL: http://localhost:3000"
echo ""
echo "Aby zatrzymać serwer, użyj: kill $FRONTEND_PID"
echo "Lub naciśnij Ctrl+C"

# Zapisz PID do pliku
echo $FRONTEND_PID > ../../frontend.pid

# Czekaj na sygnał zatrzymania
wait $FRONTEND_PID