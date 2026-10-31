# LZRE

LZRE is a multi-seller marketplace for Ghana. Customers check out once. The order is then split by seller. Money, stock, and commission are calculated on the server.

Currency and country default to GHS and GH. Both are site settings.

## Requirements

- Node.js 20 or newer
- PostgreSQL 16. `docker-compose.yml` starts a local database named `lzre`.

Docker is the expected way to run Postgres. If `docker` is not installed, use any Postgres 16 instance and set `DATABASE_URL`.

If `npm install` fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`, Node is not using the Windows certificate store. Run the install with `NODE_OPTIONS=--use-system-ca`.

## Setup

```bash
copy .env.example .env
```

Set `AUTH_SECRET` to a random string of at least 32 characters. Set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` before creating an administrator. The password must be at least 12 characters and include a letter and a number. There is no default password in the source.

```bash
docker compose up -d
npm install
npx prisma generate
npm run db:setup
npm run admin:create
npm run dev
```

If Docker is not available, `npm run db:postgres` starts a local Postgres 18 on port 5432 with the same `lzre` user, password, and database. Leave that process running, then run `npm run db:setup`.

`npm run db:setup` applies migrations and seeds demonstration data: Ghana regions, shipping zones, tax components, categories, one approved demonstration seller, the LZRE platform store, and labeled products. It does not create reviews or shipment tracking.

If `SEED_DEMO_PASSWORD` is unset, the seed generates a password and appends it to `.data/demo-passwords.txt`. That file is gitignored. Demonstration accounts:

- `customer@lzre.test`
- `seller@lzre.test`

## Payments

`PAYMENT_PROVIDER=sandbox` with `ALLOW_PAYMENT_SANDBOX=true` completes checkout in development. Those orders are marked **simulated**. They are not paid, they are excluded from sales totals, and they do not write a cash ledger.

Paystack is used when `PAYSTACK_SECRET_KEY` is set and the customer chooses card or mobile money (MTN, Telecel, AirtelTigo). An order becomes paid only after `POST /api/webhooks/paystack` verifies the `x-paystack-signature` header and the amount, currency, and reference match. The browser return URL does not mark an order paid.

Point the Paystack test webhook at `https://<your-host>/api/webhooks/paystack`.

Cash on delivery creates an unpaid order. A seller records collection only when that seller is the only seller on the order. Zones can turn cash on delivery off. Greater Accra and Ashanti allow it in the seed. The rest of Ghana does not. Seeded shipping prices are demonstration rates.

## Other services

Images are stored on local disk under `public/uploads` (JPEG, PNG, or WebP, 5 MB). Seller documents stay in `storage/private`. S3 settings in `.env.example` are optional and unused while empty.

Email uses Resend when `EMAIL_PROVIDER=resend` and `RESEND_API_KEY` is set. Otherwise messages are saved in the database and reported as not sent.

`/api/cron/cleanup` releases expired stock reservations. Send header `x-cron-secret` with the value of `CRON_SECRET`.

## Scripts

- `npm run dev` — local site
- `npm run test` — pricing, stock, permissions, and webhook checks
- `npm run typecheck` — TypeScript
- `npm run lint` — ESLint
- `npm run build` — production build
- `npm run admin:create` — create or update the administrator from `ADMIN_*`
- `npm run db:seed` — seed again without repeating migrations

Tax components in the seed (NHIL, GETFund, and VAT) are marked demonstration. They are not tax advice. Shelf prices are tax-inclusive.
