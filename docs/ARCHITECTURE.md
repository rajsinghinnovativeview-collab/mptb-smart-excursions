# MPTB Smart Excursions — Architecture & Workflow

## User journeys

1. **Public homepage** lists active events. Event detail lists published excursions with live remaining capacity. No hardcoded event or excursion catalogue.
2. **Participant login** sends OTP through the Apps Script backend and stores a server-set HttpOnly session cookie after verification.
3. **First-time registration** creates a permanent participant and opaque QR identity. A verified participant can optionally supply a badge ID; the master record is matched **only** if its email matches the verified email address. Otherwise they enter details manually.
4. **Booking** uses a script lock for seat capacity and one confirmed excursion per event/date, while allowing different dates. Cancellations are audited.
5. **Admin** adds or modifies events, excursions and activities without redeployment. Changes write to the same Google Sheet.
6. **Operator** verifies a QR pass, selects an eligible booking and marks boarded/arrived. The scan itself makes no changes; double marking is idempotent/blocked, and audit logs record actions.

## Key invariants

- `Participants` holds one record per verified email. Identity is not recreated for every booking.
- `Bookings` holds one row per participant + excursion booking; statuses are tracked independently per booking.
- QR references are generated on the server and contain no personal information. Possession of a QR is **not** authentication; the operator must hold a privileged session.
- `LockService` serialises writes to prevent basic simultaneous overbooking; note that Google Sheets is a low-throughput store and should be load-tested under expected demand.
- API shared secret exists only in the Next.js server and Apps Script properties; the public app never receives it.
- Backend roles, not visible interface state, authorize writes.

## Project limits / upcoming milestones

This initial code includes public catalogue, email OTP, profile/prefill, bookings, QR digital pass, admin CRUD for programme and operators, and QR boarding/arrival. It is a **foundation release**, not operational certification.

Pending: custom form-builder rules, bus assignment workflows, advanced capacity conflict windows, booking replacement transaction, operator exception/reversal workflow, email delivery retry queue, bulk import reconciliation, audit export, dashboards filtered by hotel/bus, security and concurrency tests, real Cloudflare + Apps Script end-to-end acceptance. No real events are seeded to avoid misrepresenting historic data as live.

For production, configure an authorised MPTB-owned Google Workspace account for Apps Script, permission review, data retention, rate limiting at Cloudflare, domain ownership, and a formal privacy and security review. Apps Script secret authentication is required because web app deployment must be reachable by the private Next.js server-side adapter.
