# Cloro

A members-only auction house for Gen Z in India. Verified members list pre-loved items, the highest bidder wins, and buyer and seller complete the deal in person or by video call plus shipping.

## Features

- **Google sign-in only.** Before verification an account is read-only: members can browse, search and read Q&A. Age comes from the Google account's birthday, or the member enters it once if Google doesn't share it.
- **Aadhaar Secure QR verification.** It is needed the first time a member lists, bids, asks a question or chats.
  - The QR code is read **in the browser**, so the card photo is never uploaded.
  - The server checks UIDAI's RSA signature on the QR data.
  - The Aadhaar date of birth becomes the member's age of record.
  - A one-way fingerprint allows only one account per person.
  - Neither the full Aadhaar number nor the card image is stored.
- **Age groups:**
  - **13–17:** need a parent or guardian to approve through a share link (the guardian signs in with their own Google account). They can bid up to ₹5,000.
  - **18–23:** list for free.
  - **24–30:** welcome, with a notice. The first listing is free, then listing needs a monthly pass (₹299 by default) paid through Razorpay.
  - **Over 30:** blocked.
- **Listings.** Size and size system are mandatory, and so is at least one real measurement for clothing, shoes and bags.
  - Listings have 2–6 photos, compressed in the browser to keep storage costs low.
  - There is no minimum price.
  - Optional bill, box and tags badges.
  - Estimated shipping is shown next to the price; the buyer always pays shipping.
- **Timed auctions.**
  - An optional hidden reserve price.
  - Tiered bid increments.
  - Anti-sniping: a bid in the last 2 minutes extends the end by 2 minutes.
  - Bids are placed inside a row-locked transaction, so simultaneous bids can't both win.
  - Live prices update by lightweight polling, with no websocket server to pay for.
- **Deals.** The winner has 48 hours to accept and chooses **meet in person** or **video call + shipping**.
  - The seller can share tracking details.
  - Both sides confirm "deal done", then rate each other.
  - If the winner declines, doesn't reply or the deal is cancelled, the seller can offer the item to bidder #2 and then #3.
  - If the reserve wasn't met, the seller can still choose to sell.
- **Public Q&A** on every listing, and **private chat between the seller and the top 3 bidders**.
  - A bidder who drops out of the top 3 keeps read-only access to past messages.
  - Phone numbers, UPI IDs, emails, links and "scan this QR" messages are flagged with a safety warning.
  - Members can block and report each other.
  - Chats with members under 18 show a warning to the other person.
- **Support desk.** Tickets can be linked to a deal, listing or chat, with image evidence.
  - Tickets are prioritised; harassment involving a minor is marked urgent and freezes the reported account right away.
  - Moderators can add internal notes and invite the other party to give their side.
  - A 48-hour response target is highlighted when missed.
  - Every time staff open a private chat, it is recorded in the audit log.
- **Strikes, only for proven misconduct.**
  - Moderators propose strikes and admins confirm them.
  - Strike 1 is a warning, strike 2 freezes trading for 30 days, and strike 3 is a permanent ban. Fraud, counterfeits or harming a minor mean an immediate ban.
  - Members can appeal each strike once, and strikes expire after 12 months.
- **Community reminders:**
  - the pledge at signup
  - "a bid is a promise" on every bid
  - safety banners in chat
  - meetup and shipping checklists
  - a help centre with a safety guide
- **In-app alerts only**, with no email or SMS. Opening an alert marks it read, and success messages appear as toasts.
- **Safety nets:**
  - Banned or frozen bidders are skipped when an item is offered.
  - Banning a member withdraws their live items and cancels their open deals, telling everyone affected.
  - Members who are frozen or have turned 31 can still finish deals already in progress.
  - Rate limits cover messages, questions, tickets and listings.
  - Guardian links expire after 7 days.
  - `next=` redirects only go to pages on Cloro.

## Design

Warm luxury: cream and blush backgrounds, deep emerald for actions and gold for highlights. Headings use Fraunces and body text Plus Jakarta Sans. Cards and pill buttons have soft rounded corners, with icons from lucide-react. On mobile there's a bottom tab bar with a central "Sell" button, and item rows scroll sideways.

## Running Cloro as an admin

1. **Become admin:** set `SEED_ADMIN_EMAIL` to your Gmail and run `npm run db:seed`. To make a friend a moderator, go to **Desk → Members**, open their member file and set their role to Moderator.
2. **What each role can do:**
   - **Moderators:** handle tickets, open member files, add staff notes, remove items and propose strikes.
   - **Admins:** everything moderators can do, plus confirm strikes, freeze, ban or reinstate members, reset a member's verification, change roles and read the audit log.
3. **Daily routine at `/admin`:**
   1. Check the overview numbers.
   2. Work the ticket queue from Urgent down; tickets waiting more than 48 hours show in red.
   3. Clear pending strikes and appeals.
4. **Member file (`/admin/users/[id]`):** everything about one member in one place:
   - identity, age band and guardian status
   - items, bids and deals
   - reports about them and tickets they opened
   - strikes and staff notes
   - admin actions: **freeze** (24 hours, 7 days or until reviewed), **reset verification**, **set role**, **ban** (with a reason)
5. **Removing a single item:** open the item and use **Staff tools → Remove item** with a reason. The seller and bidders are told, and the seller isn't banned.
6. **Accountability:** every staff action, and every time staff open a private chat, is recorded in the **Audit log**.

## Stack and running costs

- **Stack:** Next.js 16 (App Router, Server Actions), TypeScript, Tailwind CSS 4, PostgreSQL with Prisma 6, and Auth.js v5.
- **Everything paid is optional.** Without Razorpay keys, the listing pass uses a mock payment. Photos are stored on local disk unless an S3-compatible bucket is configured; Cloudflare R2 has no bandwidth fees.
- **Recurring cost:** with a free Postgres tier (e.g. Supabase or Neon) and free hosting, the main recurring cost is the domain.

## Local development

```bash
cp .env.example .env              # then set DATABASE_URL, AUTH_SECRET (npx auth secret)
                                  # for local testing also set DEV_LOGIN=true and AADHAAR_ALLOW_UNSIGNED=true
npm install
npx prisma migrate dev
npm run db:seed                   # admin@cloro.local + 3 verified members + sample lots
npm run dev
```

With `DEV_LOGIN=true`, `/signin` also shows a developer login that takes a name and email. It is ignored in production.

Sign in as `admin@cloro.local` to open the support desk at `/admin`. To make someone a moderator, go to Admin → Members and change their role.

Checks:

```bash
npm run lint
npm run typecheck
npm test          # unit tests plus auction integration tests (needs the database)
```

## Going live checklist

1. **Google OAuth client.** Set the redirect URI to `<AUTH_URL>/api/auth/callback/google` and enable the People API.
   - The `user.birthday.read` scope is a *sensitive* scope, so Google has to verify the app before other users can grant it.
   - Until then, members are asked for their date of birth once, and Aadhaar still decides their age.
2. **UIDAI Secure QR public key.** Set `UIDAI_PUBLIC_KEY_PEM` to UIDAI's published signing certificate or key for Secure QR, and set `AADHAAR_ALLOW_UNSIGNED=false`.
   - Set a long random `AADHAAR_HASH_SECRET` and never change it, or the duplicate-account check stops working.
3. **Razorpay live keys** for the 24–30 listing pass.
4. **Photo storage.** Set `STORAGE_DRIVER=s3` with R2 or S3 credentials. Local disk doesn't persist on most hosts.
5. **Settlement cron.** Set `CRON_SECRET` and call `GET /api/cron/settle` every few minutes with `Authorization: Bearer <CRON_SECRET>`.
   - Auctions also settle whenever a page is viewed, so the cron only makes sure alerts go out on time.
6. **Legal review.** Before launch, have a lawyer review:
   - privacy policy and terms, in particular DPDP Act 2023 duties for children's data, which Cloro handles with guardian consent and no tracking
   - Aadhaar usage
   - GST once listing-fee revenue grows

## Project layout

```
app/                 pages and route handlers
app/actions/         server actions (account, listings, chat, deals, support, payments)
lib/rules.ts         pure business rules: ages, bidding, fees, strikes (unit-tested)
lib/auction.ts       bidding transaction, settlement, fallback offers
lib/aadhaar.ts       Secure QR decoding and signature verification
lib/contact-filter.ts  off-platform contact detection
prisma/              schema, migrations, seed
tests/               vitest unit and integration tests
```
