# DVB EPG Manager

Eine moderne Web-Oberfläche für DVB Viewer Recording mit automatischen EPG-basierten Aufnahmen.

## Features

- 📺 EPG-Anzeige von Hörzu API
- ⏺️ Ein-Klick Aufnahme mit DVB Viewer
- 🔍 Erweiterte Filter (Titel, Genre, Sender, Zeit)
- 🤖 Automatische Aufnahme-Tasks
- 📱 Responsive Web-Interface

## Installation

### Voraussetzungen
- Node.js 16+
- DVB Viewer Media Server
- Raspberry Pi (empfohlen) oder anderer Linux-Server

### Setup
```bash
git clone <repository-url>
cd dvb-epg-manager

# Backend
cd backend
npm install
cp .env.example .env
# .env anpassen

# Frontend  
cd ../frontend
npm install

# Development starten
npm run dev
