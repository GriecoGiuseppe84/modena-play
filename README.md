# Modena Play — Affiliate Platform MVP (Rebuild solido)

Monorepo `client/` + `server/` pronto per deploy su Render + Supabase.

## Requisiti env (Render / local)
Vedi anche gli esempi:
- `server/.env.example`
- `client/.env.example`

### Server (Render: modenaplay-api)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (Supabase → Project settings → API)
- `SUPABASE_SERVICE_ROLE_KEY` (**necessaria** per Affiliate Links: crea link + tracking click + analytics)
- `JWT_SECRET` (per token admin)
- `CORS_ORIGINS` (es. https://modenaplay-web.onrender.com,http://localhost:5173)
- opzionali:
  - `WEB_URL` (base URL del frontend per il redirect del reset password, es. https://modenaplay-web.onrender.com)
  - `ADMIN_EMAIL`, `ADMIN_PASSWORD` (abilitano /admin/login)
  - `DATABASE_URL` (serve solo per il “setup wizard DB” e moduli futuri)

### Client (Render: modenaplay-web)
- `VITE_API_URL` (URL API Render)
- `VITE_SUPABASE_URL` (stesso di SUPABASE_URL)
- `VITE_SUPABASE_ANON_KEY` (stesso di SUPABASE_ANON_KEY)

## Avvio locale
```bash
npm ci
# opzionale: copia gli esempi env
# cp server/.env.example server/.env
# cp client/.env.example client/.env
npm -w server run dev
npm -w client run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:10000

## Admin (opzionale)
- Login admin: `/admin/login` (richiede `ADMIN_EMAIL` e `ADMIN_PASSWORD` su API)
- Dashboard admin: `/admin/dashboard`
- Modulo Affiliate Links: `/admin/affiliate-links`
- Diagnostica DB (opzionale): `/admin/diagnostics`
  - alias legacy: `/admin/setup`

## User/Seller Auth
- Signup: `/signup` (scegli user/seller)
- Login: `/login` (redirect automatico in base al ruolo salvato in Supabase user_metadata)
- Recupero password: `/forgot-password` → email → `/reset-password`
- Dashboard: `/user/dashboard` o `/seller/dashboard` (placeholder)

## Short links (tracking)
Quando crei un link dal pannello admin, ottieni uno short link:
- `https://<tuo-frontend>/r/<slug>`

Il redirect pagina traccia il click via API e poi porta l'utente sulla `destination_url`.

> Nota: se in Supabase è attiva la conferma email obbligatoria, la signup potrebbe non restituire sessione; in quel caso fai conferma email e poi login.

### Supabase (IMPORTANTE per reset password)
In Supabase → Authentication → URL Configuration:
- aggiungi tra gli “Redirect URLs” il tuo frontend, es. `https://modenaplay-web.onrender.com/reset-password`


### Nota build (Vite + ESM)
Nel client usiamo `postcss.config.cjs` e `tailwind.config.cjs` perché `client/package.json` ha `type: module`.


### UX login
- User/Seller: `/login`
- Admin: `/admin/login`


### Backend note
Il server compila in **CommonJS** (compatibile con Node 22 su Render) per evitare errori ESM su import senza estensione.


## Pagina pubblica "Risorse"

- `/risorse` → landing pubblica (marketing + filtri)
- `/r/:slug` → redirect short-link con tracking click

Admin:
- `/admin/affiliate-links` → CRUD link + UTM builder + mini analytics

