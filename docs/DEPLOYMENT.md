# Deployment

1. Create a Google Sheet and deploy the Apps Script backend (implementation and permissions must be reviewed before production use).
2. Configure `GAS_WEB_APP_URL` and `GAS_API_SECRET` as server-side environment variables. Never expose them as `NEXT_PUBLIC_` variables.
3. Install dependencies with `npm install`, run `npm run typecheck` and `npm run build`.
4. Configure Cloudflare Workers with the OpenNext adapter before publishing. This starter does not include a verified production deployment configuration.
5. Set up email sending and role assignments before enabling registrations. Test capacity and idempotency with concurrent requests.

**Status:** Initial UI and server bridge only. Google Apps Script service, OTP sending, booking enforcement, operator permissions and live deployment require implementation and end-to-end verification.
