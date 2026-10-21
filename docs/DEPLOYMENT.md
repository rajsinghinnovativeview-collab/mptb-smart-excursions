# Deployment and acceptance checklist

## Cloudflare Workers Builds configuration

This project uses **Next.js 16 + OpenNext for Cloudflare**. A plain `next build` only creates `.next/` and cannot be deployed with Wrangler. The repository's `npm run build` now runs the supported Next.js 16.4 release with Webpack and then `opennextjs-cloudflare build --skipNextBuild` to generate `.open-next/worker.js`, `.open-next/assets/`, and the compiled OpenNext configuration.

In **Cloudflare Dashboard → Workers & Pages → mptb-smart-excursions → Settings → Build**, use:

| Setting | Value |
| --- | --- |
| Git repository | `rajsinghinnovativeview-collab/mptb-smart-excursions` |
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | repository root |

These match the existing Cloudflare commands, so you should **not** need to change the dashboard settings if they match those above. Push/merge this fix, then retry deployment.

```sh
npm install
npm run typecheck
npm run build
test -f .open-next/worker.js
npx wrangler deploy
```

Alternatively, if working with the original upstream OpenNext scripts, set **Build command** to `npx opennextjs-cloudflare build` and **Deploy command** to `npx opennextjs-cloudflare deploy`, with `package.json`'s build script changed back to `next build` to prevent recursion. **Do not mix the two script approaches.**

**Important:** Do not put private backend values in `NEXT_PUBLIC_*`. Configure `GAS_WEB_APP_URL` and `GAS_API_SECRET` as Cloudflare **Worker runtime secrets**; if the application needs secret variables during build, configure build secrets separately. A successful frontend deployment is not proof that the Google Sheets/OTP backend is configured.

## Operational acceptance checklist

- [ ] Spreadsheet owned by authorised MPTB account and access audited
- [ ] `setupSheets()` initialised exact names and headers without overwriting existing data
- [ ] Google Apps Script properties set and shared secret is strong/rotatable
- [ ] Apps Script `/exec` endpoint reachable from Cloudflare Worker server, not from client-side code
- [ ] Cloudflare secrets configured for `GAS_WEB_APP_URL`, `GAS_API_SECRET`
- [ ] `npm install`, `npm run typecheck`, `npm run build`, `npm run preview` successful
- [ ] Public catalogue loads active events and correct capacity, never hides network errors
- [ ] First-time and returning OTP authentication tested, including expiry, retry and abuse controls
- [ ] Verified-email badge lookup tested; unauthorized badge data never disclosed
- [ ] Same-date bookings blocked under simultaneous submissions
- [ ] Different dates bookable under one permanent QR
- [ ] Cancelled booking frees seat; repeated cancellation cannot corrupt data
- [ ] Operator only accesses scoped event/excursion; QR scan alone changes nothing
- [ ] Boarding/arrival repeated scans don't double-count; audit timestamps present
- [ ] Mobile browser permissions tested over HTTPS
- [ ] Past Google Forms data imported only after schema mapping / deduplication review
- [ ] Staging data separate from production; no real passenger/guest personal data exposed
- [ ] Email quotas, alerting, abuse rate limiting, permission rules, retention policy reviewed

Deploy only after completing these checks. The current source has not been confirmed live.


Deploy for live participants only after completing the relevant security and end-to-end checks.
