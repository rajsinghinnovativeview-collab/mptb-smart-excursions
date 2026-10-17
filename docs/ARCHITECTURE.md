# Architecture

One permanent participant identity → many bookings → independent booking-specific boarding, arrival and activity completion.

Core Sheets: Events, Participants, Excursions, Activities, Bookings, Activity Selections, Bus Assignments, Operators, Audit Logs, Email Logs, System Settings, Event Form Fields, Participant Imports, Check-in Events.

Security: Server-side secret only; HttpOnly session cookies; verify roles and ownership on every Apps Script action; random opaque QR tokens; lock capacity-sensitive writes and use idempotency keys; record operator timestamps and audit trails. Never trust a client-supplied role or participant ID. Treat this repository as an initial implementation, not a production-ready booking service.
