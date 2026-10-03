# Deploying Cloro (cheapest setup that comfortably handles 1,000+ members)

**About these recommendations:** no provider pays for or sponsors anything here. Each choice is the cheapest option that fits how Cloro works.
Prices were checked in October 2026 (sources at the bottom). Free tiers change often, so check the pricing page before you sign up.

## Why one small server instead of "serverless" free tiers

Cloro has live bidding, so the site is dynamic: every page is personalised, and open item pages check for new bids every 5 seconds.
Serverless platforms bill per request and per second of compute, so that traffic adds up quickly:

- **Netlify Free** is now a hard cap of 300 credits a month, and the site **pauses** when you run out. For example, 15 GB of bandwidth uses all 300 credits on its own. An active auction site would hit the cap well before 1,000 members.
- **Vercel Hobby** doesn't allow commercial use.

A single server running Docker has **no per-request billing**: the same monthly price whether 10 or 2,000 people visit. Everything runs on it:
the app, PostgreSQL, HTTPS, the auction timer and backups. It's all defined in `docker-compose.prod.yml`, so you aren't locked into any provider.

**Measured capacity (load test, 4-core machine, zero errors):**
- **Home page:** about 68 views per second, with 50 people loading at once.
- **Item pages:** about 77 views per second.
- **Live bid updates:** about 580 requests per second, with 200 people watching at once.

Even if 100 of your 1,000 members are on the site at the same moment, that's only about 7 page views and 20 bid updates per second, so there's roughly 10× headroom.

## What it costs

| Item | Option | Monthly cost |
|---|---|---|
| Server | **A. Oracle Cloud "Always Free" ARM VM** (Mumbai or Hyderabad region) | ₹0 |
| | **B. Small VPS in India**, 2 GB RAM (DigitalOcean Bangalore, Vultr Mumbai, Hostinger, MilesWeb, etc.) | about ₹400–750 |
| Domain (`.in` or `.com`) | Any registrar; Cloudflare sells at cost | about ₹600–1,000 **per year** |
| DNS, CDN, DDoS protection | Cloudflare Free plan | ₹0 |
| Off-site database backups | Cloudflare R2 (10 GB free, no download fees) | ₹0 |
| Uptime alerts | UptimeRobot free plan | ₹0 |
| Search listing | Google Search Console + Bing Webmaster Tools | ₹0 |
| Payments (listing pass) | Razorpay: no monthly fee, about 2% per payment | per sale only |

**Total: about ₹50–85 a month with option A (just the domain), or about ₹450–850 a month with option B.**

**Which server option should you pick?**
- **Option A (Oracle) is free, but has catches:**
  - Sign-up needs a card for verification.
  - Free ARM capacity is sometimes "out of stock" in a region.
  - Oracle may reclaim idle free machines.
  - Reports from 2026 say the free allowance is being cut from 4 cores / 24 GB to 2 cores / 12 GB. That's still far more than Cloro needs.
  - If you choose it, **set up the off-site backups below** so your data survives if the machine disappears.
- **Option B (a paid VPS) is the safest choice** for something you depend on. It's also cheap enough to cover from the first few listing passes.

You need a domain either way: Google sign-in and search engines need a real address.

---

## Step-by-step

### 1. Get a domain and put it on Cloudflare (free)
1. Sign up at cloudflare.com and add your domain. If you buy it elsewhere, change its nameservers to the two Cloudflare gives you.
2. Leave DNS empty for now; you'll add the server's IP in step 3.

### 2. Create the server
- **Oracle (option A):**
  1. Go to cloud.oracle.com → Create a VM instance.
  2. Choose the Ampere A1 shape with 2 OCPU and 12 GB, and the Ubuntu 24.04 image.
  3. Under Networking → Security list, add ingress rules for TCP **80** and **443**. Also run on the server:
     `sudo iptables -I INPUT -p tcp -m multiport --dports 80,443 -j ACCEPT && sudo netfilter-persistent save`
- **VPS (option B):** create an Ubuntu 24.04 server with 2 GB RAM in Mumbai or Bangalore, and add your SSH key.
- If the server has **less than 2 GB RAM**, add swap so the build doesn't run out of memory:
  `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile && echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab`

### 3. Point the domain at the server
1. In Cloudflare DNS, add an `A` record: name `@`, value = your server's public IP.
2. Add another `A` record: name `www`, same IP.
3. Start with the cloud icon **grey ("DNS only")** so Caddy can get the HTTPS certificate.
4. After step 5 works, switch both records to **orange (proxied)**, and set SSL/TLS mode to **Full (strict)**. Cloudflare then caches photos and absorbs attacks for free.

### 4. Install Docker and the code
```bash
ssh ubuntu@YOUR_SERVER_IP
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker
git clone https://github.com/keshavkumar4699/cloro.git && cd cloro
cp .env.example .env
nano .env        # fill it in — see step 6 for where each value comes from
```

### 5. Start everything
```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps        # all services "running"; migrate "exited (0)"
docker compose -f docker-compose.prod.yml logs -f app
```
Open `https://your-domain`. If the app exits straight away, the last log line lists exactly which settings are missing.

### 6. Fill in the settings (`.env`)
| Setting | Where it comes from |
|---|---|
| `DOMAIN`, `SITE_URL`, `AUTH_URL` | Your domain, e.g. `cloro.in` and `https://cloro.in` |
| `POSTGRES_PASSWORD`, `AUTH_SECRET`, `AADHAAR_HASH_SECRET`, `CRON_SECRET` | Run `openssl rand -base64 48` once for each. **Never change `AADHAAR_HASH_SECRET` after launch.** |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | See the Google sign-in setup below. |
| `UIDAI_PUBLIC_KEY_PEM` | Download UIDAI's Secure QR public certificate from uidai.gov.in and paste its full text. Test with your own Aadhaar before launch. |
| `CONTACT_EMAIL`, `BUSINESS_NAME`, `CONTACT_ADDRESS`, `GRIEVANCE_OFFICER` | Shown on the Contact and Privacy pages. Razorpay and Google check these. |
| `RAZORPAY_*` | See the Razorpay setup below. Leave empty until Razorpay approves you. |
| `BACKUP_S3_*` | Optional but recommended; see "Backups". |

**Google sign-in setup:**
1. Go to console.cloud.google.com and create a project.
2. Set up the OAuth consent screen:
   - choose External
   - fill in the app name, support email and logo
   - add the links `https://your-domain/legal/privacy` and `https://your-domain/legal/terms`
   - add your domain under Authorised domains
3. Go to Credentials → OAuth client ID → Web application:
   - Authorised JavaScript origin: `https://your-domain`
   - Redirect URI: `https://your-domain/api/auth/callback/google`
4. **Publish** the app (switch it from "Testing" to "In production"). Cloro asks only for name, email and photo, so there's no 100-user cap and no review. Keep `GOOGLE_BIRTHDAY_SCOPE=false`.

**Razorpay setup:**
1. Sign up at razorpay.com and complete KYC (PAN and bank account). The site's Terms, Privacy, Refunds and Contact pages are already there.
2. Go to Settings → API Keys and copy the key ID and secret.
3. Go to Settings → Webhooks and add the URL `https://your-domain/api/razorpay/webhook`:
   - subscribe to the events `payment.captured` and `order.paid`
   - set a secret and copy it into `RAZORPAY_WEBHOOK_SECRET`

After editing `.env`, apply the changes with `docker compose -f docker-compose.prod.yml up -d`.

### 7. Make yourself admin
1. Sign in on the site with your Google account once.
2. Then run:
   ```bash
   docker compose -f docker-compose.prod.yml run --rm migrate npm run make-admin -- you@gmail.com
   ```
3. Refresh the site. The **Desk** link appears in the header.

### 8. Get found on Google (free)
1. Go to search.google.com/search-console, add your domain, and verify it. The DNS method is easiest with Cloudflare; or put the HTML-tag code in `GOOGLE_SITE_VERIFICATION`.
2. Open **Sitemaps** and submit `https://your-domain/sitemap.xml`. It lists every live item, category page and guide automatically.
3. Do the same at bing.com/webmasters. You can import the setup from Google.
4. Pages written to rank for searches like "sell old clothes online", "sell sneakers online India" and "online auction India":
   - `/sell`
   - `/c/sneakers`, `/c/clothes`, `/c/streetwear`, `/c/bags`, `/c/watches`, `/c/gadgets`, `/c/accessories`
   - the home page

   Every item page also carries Product data, so Google can show price and availability.
5. Search rankings take weeks to build. Sharing item links on Instagram, WhatsApp and college groups speeds it up, and the share previews are set up.

### 9. Monitoring (free)
- At uptimerobot.com, add an HTTP monitor for `https://your-domain/api/health`, checked every 5 minutes, with email or app alerts.
- Logs: `docker compose -f docker-compose.prod.yml logs --since 1h app`. Errors are single JSON lines that include `"level":"error"`.

---

## Backups
- **Built in:** the `backup` service dumps the database every 24 hours to `./backups` and keeps 14 days of copies.
- **Off-site (recommended, free):**
  1. Create a **private** Cloudflare R2 bucket named `cloro-backups`, plus an API token with read and write access to it.
  2. Fill in `BACKUP_S3_BUCKET`, `BACKUP_S3_ENDPOINT` (`https://<account-id>.r2.cloudflarestorage.com`), `BACKUP_S3_ACCESS_KEY_ID` and `BACKUP_S3_SECRET_ACCESS_KEY`.
  3. Run `docker compose -f docker-compose.prod.yml up -d`. Each nightly dump is then also uploaded to R2.
- **Restore:**
  ```bash
  gunzip -c backups/cloro_YYYY-MM-DD_HHMM.sql.gz | docker compose -f docker-compose.prod.yml exec -T db psql -U cloro -d cloro
  ```
- **Photos:** stored in the `uploads` Docker volume on the server. To keep photos off the server instead, set `STORAGE_DRIVER=s3` with an R2 bucket (10 GB free).

## Updating the site
```bash
cd cloro && git pull
docker compose -f docker-compose.prod.yml up -d --build   # migrations run automatically
```

## When to start paying more
| Sign | What to do |
|---|---|
| Pages feel slow at peak times, or the server's CPU stays above 70% | Move to a 2–4 vCPU / 4 GB server. Same commands, more power. |
| Database bigger than a few GB | Still fine on the server's disk; just keep backups running. |
| Photos over ~20 GB on a small disk | Switch `STORAGE_DRIVER` to `s3` with R2 (about $0.015 per GB each month after 10 GB). |

## Launch checklist
- [ ] `https://your-domain` loads, with a padlock, on both phone and laptop.
- [ ] Sign in with Google works, and you're an admin.
- [ ] Verify your own Aadhaar (real certificate, `AADHAAR_ALLOW_UNSIGNED=false`).
- [ ] List a test item, bid from a second account, and let the auction end. Check the "You won" alert arrives within 5 minutes.
- [ ] Open a support ticket from the second account and handle it from the Desk.
- [ ] UptimeRobot shows the site as up, and `backups/` has a file the next day.
- [ ] Sitemap submitted in Google Search Console.
- [ ] A lawyer has reviewed the Terms and Privacy pages (Aadhaar use, under-18s, DPDP Act).

## Sources (checked October 2026)
- [Netlify credit-based pricing plans (official)](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)
- [Netlify free tier limits and credit costs](https://supadrop.host/blog/netlify-pricing-free-tier-limits/)
- [Vercel vs Netlify 2026, including Vercel Hobby's non-commercial rule](https://northflank.com/blog/vercel-vs-netlify-choosing-the-deployment-platform-in-2026)
- [Oracle Cloud Always Free tier and the 2026 changes](https://terminalbytes.com/oracle-cloud-free-tier-changes-2026/)
- [Oracle Always Free review 2026](https://space-node.net/blog/oracle-vps-free-tier-review-2026)
- [Cloudflare R2 pricing and free tier](https://mecanik.dev/en/posts/cloudflare-r2-pricing-explained-real-costs-vs-s3-and-backblaze/)
- [Cheapest VPS options in India 2026](https://www.techplained.com/cheapest-vps-india)
- [Google OAuth: unverified apps and the 100-user cap (official)](https://support.google.com/cloud/answer/7454865?hl=en)
- [Neon free plan 2026, if you ever want a managed database instead](https://github.com/robhunter/agentdeals/issues/2235)
