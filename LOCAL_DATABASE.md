# Local Database Setup (Optional)

## Current Setup: Neon Production Database

By default, localhost connects to your **Neon production database**. This gives you:
- ✅ Real, fresh data from YouTube
- ✅ Working authentication and sessions
- ✅ Charts with actual metrics
- ✅ No local setup required

**This is the recommended setup for solo development.**

## When to Use Local PostgreSQL

Use a local database if you need:
- Isolated testing environment
- Offline development
- Multiple developers sharing the same Neon instance
- Testing destructive operations

## Setup Local PostgreSQL with Docker

### 1. Start Local Database

```bash
# Start PostgreSQL in Docker
docker-compose up -d

# Check it's running
docker ps
```

### 2. Switch to Local Database

```bash
# Backup your current .env.local
cp .env.local .env.local.neon.backup

# Copy local database config
cp .env.local.docker .env.local

# Add your API keys from the backup
# Edit .env.local and copy:
# - YOUTUBE_API_KEY
# - CRON_SECRET
# - BETTER_AUTH_SECRET
```

### 3. Run Migrations

```bash
# Push schema to local database
npx drizzle-kit push
```

### 4. Seed Test Data (Optional)

```bash
# Add The Grand Sound streams to local DB
npx tsx scripts/add-grand-sound-streams.ts
```

### 5. Start Polling (Optional)

If you want fresh data in local DB, manually trigger polling:

```bash
curl http://localhost:3001/api/cron/poll-youtube \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Switch Back to Neon

```bash
# Restore Neon config
cp .env.local.neon.backup .env.local

# Restart dev server
npm run dev
```

## Stop Local Database

```bash
# Stop but keep data
docker-compose stop

# Stop and remove data
docker-compose down -v
```

## Comparison

| Feature | Neon (Current) | Local Docker |
|---------|---------------|--------------|
| Real YouTube data | ✅ Automatic | ⚠️ Manual polling |
| Setup time | ✅ None | ⏱️ 5 minutes |
| Fresh data | ✅ Always current | ⚠️ Stale unless polled |
| Offline dev | ❌ Requires internet | ✅ Works offline |
| Shared state | ⚠️ Same as prod | ✅ Isolated |
| Cost | ✅ Free tier | ✅ Free (local) |

## Recommendation

**Stick with Neon for development** unless you specifically need isolation. The current setup gives you real data to test charts with, which is exactly what you want for visualization testing!
