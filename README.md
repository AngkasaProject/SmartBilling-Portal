# SmartBilling Portal

Standalone customer-facing Next.js app. It lives beside the SmartBilling repository and communicates with its Express API over HTTP; it must not access SmartBilling's SQLite database or MikroTik routers directly.

## Requirements

- Node.js 20 or newer
- SmartBilling API reachable over HTTP

## Local setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

## Docker

Install Docker Engine/Desktop with the Docker Compose plugin, then copy `.env.example` to `.env`. Set `BILLING_API_URL` to an address reachable from the container (for a Billing API running on the Docker host, use `http://host.docker.internal:3001`) and set `PORTAL_SESSION_SECRET` to the secret generated in SmartBilling. Start the Portal with:

```bash
docker compose up --build -d
```

The Portal is available at `http://localhost:1717`. To use a different host port, set `PORT` when starting Compose, for example `PORT=8080 docker compose up --build -d` (in PowerShell: `$env:PORT=8080; docker compose up --build -d`). The container listens on port `1717`; the host port can be changed independently.

View logs with `docker compose logs -f` and stop the app with `docker compose down`. The `.env` file is passed to the container at runtime and is excluded from the Docker build context.

Set `BILLING_API_URL` to the SmartBilling API origin reachable **from the Portal server process**. Use `http://localhost:3001` for local development when SmartBilling runs on the same machine, and `http://host.docker.internal:3001` when Portal runs in Docker and SmartBilling runs on the Docker host. Do not set this to the public Portal URL. Portal API calls are proxied through Next.js server routes; a `NEXT_PUBLIC_BILLING_API_URL` value is not needed.

Set `SITE_URL` to the public origin of the Portal frontend (for example, `https://portal.example.com`) so Open Graph and Twitter preview image URLs resolve correctly when links are shared. For local development, the app can use its default local origin.

Configure SmartBilling's `APP_URL` to the public Portal frontend URL (for example, `https://portal.example.com`) and `PAYMENT_WEBHOOK_URL` to the public SmartBilling API endpoint (for example, `https://billing.example.com/api/payment/webhook`). SmartBilling uses the first for signed invoice links and customer payment returns, and the second for gateway notifications. The Portal provides `/portal/billing?token=...` for signed invoice links.

Generate the portal session secret in SmartBilling under **Pengaturan → Billing & voucher → Secret sesi SmartBilling Portal**, then copy it to `PORTAL_SESSION_SECRET` in the Portal's `.env.local` (and the production deployment's environment). This secret is encrypted when stored by SmartBilling and can be revealed or copied from the authenticated admin dashboard. Keep the Portal environment value identical to the Billing-generated value; never prefix it with `NEXT_PUBLIC_`. Regenerating it invalidates existing portal sessions and requires updating the Portal environment and restarting/redeploying the Portal.

The current SmartBilling API does not enable cross-origin browser requests. Until a same-origin Next.js proxy or explicit API CORS allowlist is configured, use `BILLING_API_URL` from server components/actions rather than calling the API directly from the browser.

## Portal OTP authentication

The portal sends one-time login codes through the WhatsApp provider configured in SmartBilling (OpenWA or Fonnte). Keep `PORTAL_SESSION_SECRET` in the Portal environment identical to the Portal session secret generated in the Billing admin panel. Portal signs a timestamped, one-use HMAC request to SmartBilling's internal OTP delivery endpoint; the signing secret is never sent in a request header or response. Configure the SmartBilling WhatsApp provider and ensure its server can be reached from the Portal server.

OTP challenges are stored as short-lived, single-use hashes in SmartBilling's SQLite database, so sending and verifying an OTP can be handled by different Portal workers. Portal rate-limit counters remain in process memory; multi-instance deployments should add a shared rate-limit store to enforce limits consistently across workers.

## Portal features

- Next.js 15 App Router, TypeScript, Tailwind CSS v4, and shadcn/ui configuration.
- `/` is a public marketing page with server-fetched hotspot vouchers and monthly PPPoE packages. Hotspot purchases use Portal's same-origin API routes; monthly PPPoE subscriptions are directed to Customer Service.
- `/portal` supports WhatsApp OTP sign-in, service and invoice details, estimated monthly quota usage, scheduled renewal upgrades, and end-of-paid-term cancellation.
- Invoice payment, OTP, customer details, upgrade/cancellation requests, and server connectivity use server-side routes. The Portal does not connect to SmartBilling's SQLite database or MikroTik directly.
- Upgrade requests take effect after the next renewal invoice is paid. PPPoE usage is approximate and sampled periodically by Billing.
- Server connectivity is shown in the public and customer portal. Login and purchases are disabled when the server is unavailable.
- `src/lib/billing-api.ts` contains TypeScript response types and HTTP helpers for SmartBilling endpoints.

Configure the SmartBilling backend endpoints and shared `PORTAL_SESSION_SECRET` before enabling customer authentication. `BILLING_API_URL` must be reachable from the Portal server. For scheduled cancellation and upgrades to work, keep the Billing server's background task running.
