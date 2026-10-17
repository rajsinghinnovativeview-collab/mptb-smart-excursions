# MPTB Smart Excursions

**Unified excursion registration and tracking platform — Madhya Pradesh Tourism Board.**

Target domain: `excursions.mptb.in` (not currently deployed by this repository).

## Included

- Next.js 15 / React 19 / TypeScript responsive public catalogue and event pages
- Verified email OTP login, secure HttpOnly session cookies, reusable participant profiles
- Badge ID lookup **only after verified-email ownership check**, with manual profile fallback
- Event/date-specific booking with basic server-side collision and capacity rules
- Persistent opaque QR pass, downloadable by participants
- Admin management of events, excursions, activities and operator records
- Operator mobile QR camera scanning, booking lookup, boarding and arrival verification
- Google Sheets database via dedicated Google Apps Script backend; full backend logic in `apps-script/Code.gs`
- Cloudflare Workers / OpenNext deployment configuration

## Set up

1. Create a new Google Spreadsheet under an authorised Google Workspace account. Copy its spreadsheet ID.
2. Create a standalone Google Apps Script project under the **same authorised account**, paste `apps-script/Code.gs`, and set Script Properties (`Project Settings > Script Properties`):
   - `SPREADSHEET_ID` = spreadsheet ID
   - `API_SHARED_SECRET` = a long random secret (same as server config)
   - `BOOTSTRAP_ADMIN_EMAIL` = the verified email of the initial administrator
3. Run `setupSheets()` **once** from the Apps Script editor to create standardized headers. Approve required Apps Script permissions. No production delegate data is added automatically.
4. Deploy Apps Script as a Web App, execute as **Me** (the authorised MPTB-owned script account), access **Anyone**; copy the HTTPS `/exec` deployment URL. Access is protected by the application's strong shared secret, but review your organisation's security policy before enabling this deployment configuration.
5. Copy `.env.example` to `.env.local`; set `GAS_WEB_APP_URL` and `GAS_API_SECRET`. **Never place these secrets in `NEXT_PUBLIC_` variables or commit them.**
6. `npm install` then `npm run dev` to develop. Run `npm run typecheck` and `npm run build` before deployment.
7. For Cloudflare Workers, set both secrets using Wrangler (`npx wrangler secret put GAS_WEB_APP_URL` and `npx wrangler secret put GAS_API_SECRET`), then `npm run deploy`. Point the verified custom domain to the Worker using Cloudflare's Custom Domains interface.

**Security:** Apps Script endpoints behind the server adapter accept an API secret. OTPs and bearer sessions must never appear in public logs. Keep the Google Sheet, Script project and Cloudflare deployment on authorised accounts. Strict Cloudflare IP / Turnstile rate controls and operational testing are required before publicly promoting the portal.

**Operational status:** Code scaffold, **not yet connected to a live spreadsheet**, not tested in an MPTB production environment. See [Architecture](docs/ARCHITECTURE.md) and [Deployment checklist](docs/DEPLOYMENT.md).
