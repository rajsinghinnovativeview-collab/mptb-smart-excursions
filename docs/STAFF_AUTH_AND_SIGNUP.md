# MPTB Smart Excursions — staff credentials and participant onboarding

## New experience

The main navigation is for **participants**: Home, Events, My bookings, Register, Sign in.
Admin and Operator remain available via their dedicated routes and footer staff links. Their **staff ID/password forms are shown in those sections only**. Staff cannot sign in using participant OTP. Delegate sign-in remains **email OTP only**.

- **New participant**: /signup → choose Badge ID lookup or manual registration → enter badge ID (optional) + email → email OTP → prefill badge data only if the badge belongs to the verified email → review and save profile → QR pass/dashboard.
- **Returning participant**: /login → email OTP → /dashboard with My Bookings, QR pass and editable profile.
- **Staff**: /admin or /operator → assigned staff ID and password → role-scoped dashboard, editable profile.
- **Super Admin**: /admin → Cloudflare-managed staff ID/password → Staff accounts tab to create, update, disable, and rotate passwords for MPTB Admin, Event Coordinator, Bus Operator, Site Operator, Activity Verifier and Tour Operator.
- Staff passwords have **no self-service reset**. Super Admin may rotate or disable them; rotations revoke sessions.
- Staff passwords are stored as **salted, iterated hashes with a separate server-side pepper** in the `Operators` sheet. Never paste plain passwords into the sheet.

## Mandatory configuration

After pulling the updated `apps-script/Code.gs` into the *existing* Apps Script project:

1. Keep existing Script Properties `SPREADSHEET_ID`, `API_SHARED_SECRET`, `BOOTSTRAP_ADMIN_EMAIL`. Super Admin email remains `excursions@mptb.in`, provided the mailbox is operational.
2. Add `BOOTSTRAP_BRIDGE_KEY`: **new secret randomly generated**, 32+ characters. This key is *different* from `API_SHARED_SECRET`.
3. Run `setupSheets()` again. It adds only missing staff credential and session authentication columns; it preserves existing records and automatically generates a `STAFF_PASSWORD_PEPPER` Script Property.
4. Use Deploy → Manage deployments → Edit → **New version** → Deploy; keep the existing `/exec` URL.
5. In Cloudflare Workers → Settings → **Production** → Variables & Secrets, retain:
   - `GAS_WEB_APP_URL` — original Apps Script `/exec` URL
   - `GAS_API_SECRET` — same value as Apps Script `API_SHARED_SECRET`
6. Add Cloudflare settings:
   - `SUPER_ADMIN_USERNAME` — Variable or Secret, a private login ID (e.g. `mptb-control`), **not** the administrator email.
   - `SUPER_ADMIN_PASSWORD` — **Secret**; unique, random strong password at least 14 characters.
   - `GAS_BOOTSTRAP_KEY` — **Secret**, exactly the same new random value as Apps Script `BOOTSTRAP_BRIDGE_KEY`.
7. Redeploy the Worker after merging the GitHub PR.

**Never commit secret values to GitHub or place them in the public browser JavaScript.** Replace the previously shared demo `API_SHARED_SECRET` before production, in both Cloudflare and Apps Script.

## Data schema migration

`setupSheets()` **appends** to `Operators`: `Username`, `Password Salt`, `Password Hash`, `Credential Updated At`, `Login Attempts`, `Locked Until`.

It **appends** to `Sessions`: `Auth Method`, `Staff ID`.

All other existing columns are preserved. Existing operator rows remain present but cannot sign in with credentials until Super Admin creates new credentialed records (or those legacy records are migrated into managed accounts). Existing OTP sessions remain participant-only.

## Authentication guardrails

- Delegate sessions are explicitly marked `DELEGATE`; staff sessions `STAFF`. Delegate sessions cannot call staff management or operator actions.
- Bootstrap Super Admin credentials are checked in the Cloudflare Worker and **never sent to Apps Script**.
- Apps Script grants a bootstrap staff session only with an independent `BOOTSTRAP_BRIDGE_KEY`; exposing `API_SHARED_SECRET` alone is insufficient.
- Staff login attempts are locked for 15 minutes after five failed passwords; active accounts can be disabled by Super Admin.
- Existing staff sessions are revoked after password rotation or account disable.
- Badge records are returned only after OTP verification AND a matching email address; unverified badge lookups never expose names or contact data.
- Use Cloudflare rate-limiting/WAF rules for `/api/bridge`, particularly Super Admin password attempts; the Worker currently has no durable IP throttling.
- Authenticated staff can only access assigned events/excursions through existing backend role and scope checks. Review live operator access with test records before production.

## Important OTP sender note

This change does **not** configure NevTan outgoing mail. Current Apps Script `MailApp` sends using the Google account running the deployment, not `noreply@mptb.in`. A separate supported transactional mail integration is necessary for that sender address.

## Acceptance tests

- [ ] Run Apps Script `setupSheets()` and deploy a new version
- [ ] Verify Super Admin Cloudflare credentials and bootstrap key
- [ ] Super Admin signs in via /admin and creates MPTB Admin, Bus Operator and Site Operator
- [ ] Staff login works only in the appropriate section
- [ ] Password rotation and disable revoke active staff sessions
- [ ] Admin dashboard and operator scanner remain functional
- [ ] Delegate cannot use OTP to enter admin/operator sections
- [ ] Badge mismatch does not reveal data; manual signup still works
- [ ] Manual signup → OTP → profile → QR pass
- [ ] Returning OTP login → bookings and profile
- [ ] Deploy build/typecheck and perform real end-to-end testing before enabling live guest data

Do **not** go live until these tests and backend/Cloudflare credential configuration are complete.
