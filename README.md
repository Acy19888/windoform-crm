# Windoform CRM

Internes CRM-System für Windoform – Kunden, Angebote, Aufgaben, Produkte.

## Setup

1. Erstelle ein neues Firebase-Projekt (oder nutze das bestehende)
2. Aktiviere Firestore + Authentication (Email/Password)
3. Deploy auf Vercel mit den Firebase Environment Variables

```bash
npm install
cp .env.example .env  # Firebase Keys eintragen
npm run dev
```

## Module

- **Dashboard** – Umsatz, Pipeline, Verkäufer-Ranking, Zeitfilter
- **Kunden** – Kontakte mit Status, Notizen, Historie
- **Angebote** – Deals mit Betrag, Status (Lead → Gewonnen/Verloren)
- **Aufgaben** – Reminder mit Fälligkeitsdatum, Priorität, Kundenverknüpfung
- **Produkte** – Katalog mit Preisen, SKU, Kategorien

## Tech Stack

React 18, Vite, Firebase Firestore, Recharts, Montserrat Font
