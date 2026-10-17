# Deployment and acceptance checklist

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
