🎭 Blef – Gra przeglądarkowa z blefem i głosowaniem
Blef to gra towarzyska online, w której jeden z graczy w każdej rundzie otrzymuje inne pytanie niż pozostali. Celem oszusta jest odpowiedzieć tak, by nie zostać wykrytym, a reszty – by go rozpoznać. Gra oparta jest na blefowaniu, dedukcji i głosowaniu.

⚙️ Funkcje
  🔗 Tworzenie lobby i dołączanie przez link
  🎮 Dowolna liczba graczy w lobby
  🧠 Losowanie pytań – inne dla oszusta
  ✍️ Wpisywanie odpowiedzi
  ✅ Przejście dalej tylko po wpisaniu odpowiedzi przez wszystkich
  🗳️ Głosowanie na oszusta (z opóźnieniem – dopiero po kliknięciu „gotowy” przez wszystkich)
  🧾 Automatyczne przyznawanie punktów:
    osoby, które zgadną – dostają punkt
    oszust dostaje tyle punktów, ilu graczy się pomyliło
  📊 Tablica wyników między rundami
  ⏳ Odliczanie między rundami
  📦 Dane przechowywane w bazie (MySQL)

🛠 Stack technologiczny
Frontend: React + Socket.IO Client + React Router

Backend: Node.js + Express + Socket.IO + MySQL

Baza danych: MySQL (łatwa do wdrożenia na większości hostingów)

▶️ Uruchomienie lokalnie
1. Backend
bash
Kopiuj
Edytuj
cd backend
npm install
node index.js
Domyślnie uruchamia się na http://localhost:3001.

2. Frontend
bash
Kopiuj
Edytuj
cd frontend
npm install
npm start
Domyślnie uruchamia się na http://localhost:3000.

📂 Struktura katalogów
bash
Kopiuj
Edytuj
blef/
├── backend/
│   └── index.js          # Serwer z socket.io i endpointami
├── frontend/
│   ├── App.jsx           # Główne trasy
│   ├── JoinLobbyPage.jsx # Dołączanie do lobby przez link
│   └── LobbyRoom.jsx     # Główne lobby z listą graczy
🔒 Dołączanie do gry
Gracze mogą dołączać do lobby przez link, np.:

arduino
Kopiuj
Edytuj
https://blefgame.com/lobby/123e4567-e89b-12d3-a456-426614174000
📌 W planach
🔤 Tłumaczenie UI na różne języki

💬 Czat w grze

📱 Wersja mobilna

🧩 Edytor własnych pytań

👤 Autor
Projekt tworzony z myślą o łatwej, interaktywnej zabawie ze znajomymi – inspirowany grami typu Impostor i Spyfall.
