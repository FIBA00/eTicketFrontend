# Deployment Guide

## Local development

### Prerequisites

- Node.js 20+
- pnpm (frontend) / npm (backend)
- Docker + Docker Compose
- PostgreSQL 16 (via Docker)

### Step 1: Start infrastructure

```bash
cd e-ticket-v2
docker compose -f infra/docker-compose.yml up -d db redis
```

This starts:

- PostgreSQL on :5432
- Redis on :6379

### Step 2: Setup backend

```bash
cd apps/api
cp .env.example .env
# Edit .env if needed (defaults work with docker-compose)
```

`.env`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/eticket"
JWT_SECRET="your-secret-here-min-16-chars"
JWT_REFRESH_SECRET="your-refresh-secret-here"
PORT=3000
NODE_ENV=development
```

### Step 3: Install + migrate + seed

```bash
npm install
npm run db:generate   # Generate SQL from Drizzle schema
npm run db:migrate    # Apply to PostgreSQL
npm run db:seed       # Insert demo data
```

### Step 4: Start backend

```bash
npm run dev
# API: http://localhost:3000
# Health: http://localhost:3000/health
```

### Step 5: Setup frontend

```bash
cd ../../e-ticket-full/artifacts/transit-eticket
cp .env.example .env
# Edit .env: VITE_API_URL=http://localhost:3000
pnpm install
pnpm dev
# Frontend: http://localhost:5173 (or whatever Vite assigns)
```

### Step 6: Login

Open frontend, login with:

- `admin / admin123` (full access)
- `ticketer1 / ticketer123` (ticketing only)

## Production deployment

### Backend

1. **Environment**

   ```bash
   NODE_ENV=production
   JWT_SECRET=<strong-random-32-chars>
   JWT_REFRESH_SECRET=<different-strong-random-32-chars>
   DATABASE_URL=<production-postgres-url>
   ```

2. **Build**

   ```bash
   npm run build
   npm run db:deploy  # Apply migrations
   ```

3. **Run**

   ```bash
   npm start
   # Or with PM2:
   pm2 start dist/app.js --name eticket-api
   ```

4. **Nginx reverse proxy**
   ```nginx
   server {
     listen 80;
     server_name api.yourdomain.com;

     location / {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_cache_bypass $http_upgrade;
     }
   }
   ```

### Frontend

1. **Build**

   ```bash
   pnpm build
   # Output: dist/public/
   ```

2. **Serve**

   ```nginx
   server {
     listen 80;
     server_name app.yourdomain.com;

     root /path/to/dist/public;
     index index.html;

     location / {
       try_files $uri $uri/ /index.html;
     }
   }
   ```

3. **Environment**
   Set `VITE_API_URL=https://api.yourdomain.com` before building.

## Docker deployment

```bash
# Build and run all services
docker compose -f infra/docker-compose.yml up -d

# Or build production image
cd apps/api
docker build -t eticket-api .
docker run -p 3000:3000 --env-file .env eticket-api
```

## Backup

```bash
# PostgreSQL backup
pg_dump -U postgres eticket > backup_$(date +%Y%m%d).sql

# Restore
psql -U postgres eticket < backup_20250925.sql
```

## Monitoring

- Health check: `GET /health`
- Logs: Pino structured logs to stdout
- Errors: Check `error` field in response
