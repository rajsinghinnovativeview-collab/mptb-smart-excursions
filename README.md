# MPTB Smart Excursions

Initial Next.js/TypeScript platform for the Madhya Pradesh Tourism Board.

## Modules

Public event catalogue, event detail pages, email OTP login UI, participant dashboard, administrator dashboard and operator QR lookup UI. All data requests pass through a server-side bridge intended for Google Apps Script / Google Sheets.

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Configure the Google Apps Script endpoint and secret in `.env.local`. See [deployment](docs/DEPLOYMENT.md) and [architecture](docs/ARCHITECTURE.md).

**Important:** This is a development foundation, not a production-ready service. The Apps Script implementation, actual OTP delivery, secure backend sessions, booking transactions, QR scanning, admin mutations and end-to-end testing still need to be completed. Do not accept live registrations until these are verified.
