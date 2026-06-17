# WhatsApp AI Platform — Production Deployment Guide

Deploy on **Koyeb** (free Docker compute) + **Supabase** (free PostgreSQL).

---

## Step 1: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a name (e.g., `whatsapp-ai-platform`)
3. Set a strong database password — **save it**
4. Wait for provisioning (~2 minutes)
5. Go to **Project Settings → Database → Connection string (URI)**
6. Copy the `postgresql://` URL — you'll need this

## Step 2: Push the Database Schema

```bash
# From the project root:
npm install

# Generate Prisma client
npx prisma generate --schema=backend/prisma/schema.prisma

# Push schema to Supabase
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres" \
  npx prisma db push --schema=backend/prisma/schema.prisma
```

## Step 3: Create the Admin User

```bash
# Run the seed script with your DB URL:
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres" \
  npx tsx backend/prisma/seed.ts
```

Default credentials: `admin@whatsapp.ai` / `admin123`
**Change these in production** — generate a hash with:

```bash
npx tsx backend/prisma/generate-hash.ts your-secure-password
```

Then insert the output SQL into Supabase's SQL Editor.

## Step 4: Generate the Master Encryption Key

```bash
openssl rand -hex 16
# Example: 7f3b8a2c9d1e4f5a6b7c8d9e0f1a2b3c
```

This encrypts tenant OpenRouter API keys at rest.

---

## Step 5: Deploy to Koyeb

### Via GitHub (recommended)

1. Push this repo to GitHub
2. Go to [app.koyeb.com](https://app.koyeb.com) → **Create App**
3. Select **GitHub** as source → connect your repo
4. Builder: **Dockerfile**
5. Port: **8080**
6. Set **Environment Variables:**

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
NODE_ENV=production
PORT=8080
MASTER_ENCRYPTION_KEY=7f3b8a2c9d1e4f5a6b7c8d9e0f1a2b3c
FRONTEND_URL=https://your-app.koyeb.app
```

7. **Health Check:** `/api/health`, interval 30s, initial delay 15s
8. Deploy!

### Via Koyeb CLI

```bash
koyeb app create whatsapp-ai-platform

koyeb service create \
  --app whatsapp-ai-platform \
  --name api \
  --dockerfile ./Dockerfile \
  --port 8080 \
  --env DATABASE_URL="postgresql://..." \
  --env NODE_ENV=production \
  --env MASTER_ENCRYPTION_KEY="..." \
  --env FRONTEND_URL="https://whatsapp-ai-platform.koyeb.app" \
  --health-check-path /api/health
```

---

## Step 6: Verify

Once deployed, visit:

```
https://your-app.koyeb.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "uptime": 12.34,
  "activeSockets": 0,
  "totalSessions": 0
}
```

Then open the dashboard:
```
https://your-app.koyeb.app
```

Login with: `admin@whatsapp.ai` / `admin123`

---

## Production Notes

### Stateless Container Design

| Data | Where it lives | Survives restart? |
|------|---------------|-------------------|
| WhatsApp auth keys | `BaileysAuthState` table (Supabase) | ✅ |
| Session state | `BaileysSession` table | ✅ |
| Messages | `MessageLog` table | ✅ |
| Uploaded media | In-memory (not stored) | ❌ (design limitation) |

### Keep Alive (Prevent Idle Timeout)

Koyeb free tier sleeps after 30 minutes of inactivity. Use a free cron service like [cron-job.org](https://cron-job.org) to ping:

```
https://your-app.koyeb.app/api/health
```

Every 5 minutes.

### Free Tier Capacity

- **Koyeb:** 1 vCPU, 512MB RAM → handles 3-5 concurrent WhatsApp sessions
- **Supabase:** 500MB PostgreSQL → stores ~500k messages + auth keys
- **OpenRouter:** Llama 3 8B (free) → ~20 messages/min per tenant

### Updating

Push to your GitHub repo's main branch. Koyeb auto-rebuilds and redeploys.
WhatsApp sessions will auto-reconnect thanks to the Prisma auth adapter.

---

## Troubleshooting

### "Bad MAC" Error After Restart
- The Buffer serialization in `usePrismaAuthState` is failing
- Check that `BaileysAuthState` records exist for the session
- If corrupted, disconnect the session and re-scan the QR code

### Frontend Shows Blank Page
- Check browser console for errors
- Ensure the frontend built successfully (`npm run build -w frontend`)
- Verify Express is serving the `frontend/out/` directory

### WebSocket Not Connecting
- Ensure your Koyeb app uses port 8080
- WebSocket uses the same port as HTTP (upgrade handshake)
- The plugin is not required for WebSocket on the same origin

### Login Fails
- Verify the admin user exists in `AdminUser` table
- Check Supabase SQL Editor: `SELECT * FROM "AdminUser";`
- Password hash must use the `salt:hash` format from `generate-hash.ts`
