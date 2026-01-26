# Modena Play Platform (MVP 1.0)

Monorepo **React (Vite) + Node/Express + Supabase** per una piattaforma affiliate con dashboard admin e tracking link.

## Architettura

- `client/`: React 18 + Vite + TypeScript + Tailwind + React Query + PWA basic
- `server/`: Node.js + Express + TypeScript + JWT (access + refresh via httpOnly cookie)
- `Supabase`: PostgreSQL + Auth + RLS + RPC helpers

---

## Requisiti

- Node 18+ (consigliato Node 22)
- Supabase project (free tier ok)
- Render account (free tier ok)

---

## Setup locale (step-by-step)

### 1) Clona e installa
```bash
npm ci
```

### 2) Supabase: applica la migration SQL
Apri Supabase -> **SQL Editor** -> incolla ed esegui:

`server/src/database/migrations/001_init_schema.sql`

> Nota: l’MVP include RLS + trigger profilo su signup e funzioni RPC (mg_now, mg_inc_click, mg_analytics_summary).

### 3) Configura env

#### server/.env
Copia `server/.env.example` in `server/.env` e compila:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `JWT_SECRET`
- `CORS_ORIGINS` (include http://localhost:5173)

#### client/.env
Copia `client/.env.example` in `client/.env`:

- `VITE_API_URL=http://localhost:10000`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 4) Avvia in dev

In due terminali:

```bash
npm run dev --workspace server
```

```bash
npm run dev --workspace client
```

Apri: http://localhost:5173

---

## Setup Wizard Admin (obbligatorio)

1. Vai su `/login` e fai login con `ADMIN_EMAIL` + `ADMIN_PASSWORD` (env).
2. Vai su `/admin/setup`
3. Esegui Step 1..5

Se Step 2 fallisce, significa che non hai ancora applicato la migration SQL su Supabase.

---

## Endpoint principali

### Health
- `GET /api/health`

### Auth
- `POST /api/auth/admin/login` -> `{accessToken}` + cookie refresh
- `POST /api/auth/refresh` -> nuovo access token
- `POST /api/auth/logout` -> revoke access token (audit_log) + clear cookie

### Affiliate
- `GET /api/affiliate/links` (authed)
- `POST /api/affiliate/links` (authed)
- `PATCH /api/affiliate/links/:id` (authed)
- `GET /api/affiliate/r/:id` (public) redirect + tracking click

### Analytics
- `GET /api/analytics/summary?from=...&to=...` (authed)
- `GET /api/analytics/top-links?limit=10` (authed)

---

## Render deploy (quick checklist)

### 1) Crea 2 servizi su Render
- **modenaplay-api** (Node)
- **modenaplay-web** (Node)

Puoi usare `render.yaml` (Blueprint) oppure configurarli manualmente.

### 2) Env vars su Render (API)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_ANON_KEY` (opzionale)
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `JWT_SECRET`
- `CORS_ORIGINS` = `https://modenagiochi.com,https://www.modenagiochi.com,http://localhost:5173`
- `COOKIE_DOMAIN` = `modenagiochi.com`
- `NODE_ENV=production`

### 3) Env vars su Render (WEB)
- `VITE_API_URL` = URL del servizio API render
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 4) Supabase
Assicurati di aver applicato la migration.

---

## GitHub Actions

### Secrets richiesti
Nel repo GitHub -> Settings -> Secrets and variables -> Actions:

- `RENDER_API_DEPLOY_HOOK`
- `RENDER_WEB_DEPLOY_HOOK`

(Prendi i Deploy Hooks dai due servizi Render.)

---

## Troubleshooting

**CORS blocked**
- Controlla `CORS_ORIGINS` (deve includere l’origine del frontend)
- Ricorda: in produzione i domini devono combaciare (https)

**Setup Step 2 fallisce**
- Applica `server/src/database/migrations/001_init_schema.sql` su Supabase

**401 Unauthorized**
- Fai login admin, poi verifica che l’header `Authorization: Bearer ...` sia presente (gestito automaticamente dal client dopo login/refresh).

---

## Note MVP

- La parte “Blog CMS” e “Marketplace multi-vendor” sono predisposte a livello routing e UI base.
- Per un chart vero (Clicks vs Conversions) possiamo aggiungere una libreria chart (es. Recharts) in V1.1.


## Branding assets
- Logo: `client/public/logos/modenaplay_logo.svg`
- Favicons: `client/public/favicon-*.png` + `client/public/favicon.ico`
- Brand rules: `BRAND_GUIDELINES.md`
