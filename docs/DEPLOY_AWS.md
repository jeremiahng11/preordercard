# Deploying to AWS (plain Docker on EC2 + RDS Postgres)

This runs the app as a single always-on Docker container on one EC2 instance,
behind Caddy for automatic HTTPS, using an Amazon RDS for PostgreSQL database.

A single instance is intentional: the app runs an in-process scheduler for
scheduled gift delivery, so exactly one running container avoids double-sends.

```
Internet ──HTTPS──> EC2 (Caddy :443) ──> web container (:3000) ──> RDS Postgres
```

Migrations apply automatically on container start (`src/instrumentation.ts`), so
there is no manual DB migration step.

---

## Prerequisites

- An AWS account and the AWS Console (or CLI).
- A domain you can edit DNS for (needed for HTTPS + payment redirects).
- This repo.

---

## 1. Create the database (RDS for PostgreSQL)

1. RDS → **Create database** → **Standard create** → **PostgreSQL**.
2. Templates: **Free tier** or **Dev/Test**. Instance: `db.t4g.micro` is fine to start.
3. Settings:
   - DB instance identifier: `giftacard-db`
   - Master username: `giftacard`
   - Master password: set a strong one (save it).
4. Storage: 20 GB gp3 is plenty.
5. Connectivity:
   - **Public access: No** (keep the DB private).
   - VPC: default is fine. Note the **VPC** and **subnet/AZ** — put the EC2 box in the same VPC.
   - Create a new security group, e.g. `giftacard-db-sg` (we'll allow the app in later).
6. Additional config → **Initial database name**: `giftacard`.
7. Create. When it's **Available**, copy the **Endpoint** (e.g. `giftacard-db.xxxx.ap-southeast-1.rds.amazonaws.com`).

Your connection string:
```
DATABASE_URL=postgres://giftacard:<PASSWORD>@<RDS-ENDPOINT>:5432/giftacard
```

> RDS enforces TLS. The `postgres` driver used here negotiates TLS automatically;
> if you hit a cert error, append `?sslmode=require` to the URL.

---

## 2. Launch the app server (EC2)

1. EC2 → **Launch instance**.
   - Name: `giftacard-web`
   - AMI: **Amazon Linux 2023** (or Ubuntu 22.04+).
   - Type: `t3.small` (2 GB RAM) recommended; `t3.micro` works for light use.
   - Key pair: create/select one so you can SSH.
   - Network: **same VPC as RDS**. Auto-assign public IP: **Enable**.
   - Security group `giftacard-web-sg` — inbound rules:
     - **22** (SSH) from **your IP only**
     - **80** (HTTP) from `0.0.0.0/0`  ← Caddy needs it for the ACME challenge
     - **443** (HTTPS) from `0.0.0.0/0`
2. Launch, then allocate an **Elastic IP** and associate it with the instance
   (so the public IP is stable for DNS).

### Let the app reach the database

RDS → your DB → its security group (`giftacard-db-sg`) → **Inbound rules** → add:
- Type **PostgreSQL (5432)**, Source = the **`giftacard-web-sg`** security group.

This lets only the app instance connect to Postgres.

---

## 3. Point your domain at the server

At your DNS provider, create an **A record**:
```
gift.yourdomain.com  →  <EC2 Elastic IP>
```
Wait for it to resolve (`dig gift.yourdomain.com` shows the EIP) before starting
Caddy, so the TLS certificate can be issued.

---

## 4. Install Docker and deploy

SSH in, then:

```bash
# Amazon Linux 2023
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user           # log out/in so `docker` works without sudo

# Docker Compose plugin
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m) \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Get the code
git clone https://github.com/jeremiahng11/giftacard.git
cd giftacard
```

Create `.env` (see `.env.example` for the full list). At minimum:

```bash
cat > .env <<'EOF'
DATABASE_URL=postgres://giftacard:<PASSWORD>@<RDS-ENDPOINT>:5432/giftacard

DOMAIN=gift.yourdomain.com
APP_BASE_URL=https://gift.yourdomain.com

# Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<a strong password>
ADMIN_SESSION_SECRET=<random 32+ chars>

# Aleta Planet payment gateway
ALETA_SERVER=paysit.aletapay.com
ALETA_MERCHANT_CODE=...
ALETA_MID=...
ALETA_PRIVATE_KEY=...
ALETA_PUBLIC_KEY=...

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
EMAIL_FROM=Aleta Adventure <you@example.com>

# Redemption API (optional legacy production key)
REDEEM_API_KEY=<long random>
EOF
```

Build and start:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f web    # watch boot + migrations
```

Visit `https://gift.yourdomain.com` — Caddy issues the certificate on first hit
(give it a few seconds). The admin dashboard is at `/admin`.

---

## 5. Updating / redeploying

```bash
cd giftacard
git pull
docker compose -f docker-compose.prod.yml up -d --build
```
New migrations apply automatically on the new container's boot.

Alternative (CI/ECR): build the image in CI, push to Amazon ECR, then on the box
set `ECR_IMAGE` and swap the compose `build:` for `image:` — pull instead of build.

---

## 6. After go-live checklist

- [ ] `APP_BASE_URL` and `DOMAIN` are the real HTTPS domain (required for the Aleta
      payment return + webhook and the Web Share button).
- [ ] Aleta merchant is **active** for this environment and your public key is
      registered with Aleta (see `INVALID_MERCHANT` / signature notes).
- [ ] SMTP sender is verified with your provider (test via admin → Resend).
- [ ] Change the seeded admin password; create real users.
- [ ] RDS **automated backups** enabled (default 7 days) — verify the retention.
- [ ] Restrict SSH (port 22) to your IP; keep 5432 closed to the internet.

---

## Notes & limits

- **Single instance by design.** The scheduled-gift sender runs inside the app
  process. If you ever run more than one container, move scheduling to a proper
  cron/queue (e.g. EventBridge + a one-shot task) to avoid duplicate sends.
- **Logs:** `docker compose -f docker-compose.prod.yml logs -f web`.
- **Backups:** RDS handles DB backups. The app itself is stateless (all state is
  in Postgres), so the EC2 box is disposable — you can rebuild it from this repo.
- **No domain yet?** Comment out the `caddy` service in `docker-compose.prod.yml`
  and expose the app on port 80 directly, but real card payments need HTTPS.
