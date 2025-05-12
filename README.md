# 🎭 Blef

**Blef** to przeglądarkowa gra towarzyska oparta na blefie i głosowaniu. Gracze odpowiadają na pytania i próbują wskazać, kto z nich dostał inne pytanie – czyli jest oszustem. Gra stawia na spryt, dedukcję i dobrą zabawę w gronie znajomych.

---

## 🔗 Funkcje

- Tworzenie lobby i dołączanie przez link
- Dowolna liczba graczy w pokoju
- Hasła zabezpieczające lobby (opcjonalnie)
- Losowanie pytań – jedno inne dla oszusta
- Wpisywanie odpowiedzi przez wszystkich graczy
- Przejście do głosowania po zakończeniu wpisywania przez wszystkich
- Opóźnione ujawnianie głosów po kliknięciu "gotowy"
- Automatyczne przyznawanie punktów:
  - Gracze zgadujący trafnie – punkt
  - Oszust – tyle punktów, ilu graczy się pomyliło
- Tablica wyników między rundami z odliczaniem do kolejnej
- Backend z Socket.IO i MySQL

---

## 🧱 Stack technologiczny

- **Frontend:** React, React Router, Socket.IO Client
- **Backend:** Node.js, Express, Socket.IO
- **Baza danych:** MySQL

---

## ▶️ Uruchomienie lokalnie

### 1. Backend

```bash
cd backend
npm install
node index.js
```

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

> Domyślnie:
> - Backend: `http://localhost:3001`
> - Frontend: `http://localhost:3000`

---

## 📁 Struktura katalogów

```
blef/
├── backend/              # Serwer z Socket.IO i bazą danych
│   ├── index.js
│   └── routes/
├── frontend/             # Klient React
│   ├── App.jsx
│   ├── JoinLobbyPage.jsx
│   ├── LobbyRoom.jsx
│   └── ...
```

---

## 🔐 Dołączanie do gry

Gracze mogą dołączać przez link np.:

```
https://blefgame.com/lobby/123e4567-e89b-12d3-a456-426614174000
```

---

## 🧠 Jak działa gra

- W każdej rundzie losowana jest para pytań (dla graczy i dla oszusta).
- Wszyscy wpisują odpowiedzi na swoje pytania.
- Po kliknięciu "gotowy" przez wszystkich – przejście do głosowania.
- Po kliknięciu "gotowy" na ekranie głosowania – ujawnienie głosów i oszusta.
- System przyznaje punkty.
- Wyświetlana jest tablica wyników z odliczaniem do nowej rundy.

---

## 📌 W planach

- Czat w lobby i podczas gry
- Tryb turniejowy
- Edytor własnych pytań
- Publiczne i prywatne lobby
- Tłumaczenia językowe

---

## 🧪 Przykładowe dane

W repozytorium dostępny jest plik z 100 parami pytań do bazy danych (`questions.sql`).
