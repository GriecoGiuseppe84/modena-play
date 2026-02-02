# Modena Play — Setup Supabase (Auth + DB)

Questa repo usa **Supabase Auth** per:
- Signup/Login (email + password)
- Recupero password (link → `/reset-password`)

Il DB (tabelle) può essere:
- **Supabase Postgres** (consigliato, perché hai tutto nello stesso progetto)
- oppure un Postgres esterno (Render/Neon ecc.)

---

## 1) Crea il progetto Supabase
1. Crea un nuovo progetto su Supabase.
2. Vai in **Project Settings → API** e copia:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - *(opzionale)* `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2) Configura le Redirect URL (obbligatorio per reset password)
Supabase → **Authentication → URL Configuration**:

- **Site URL** (frontend):
  - produzione: `https://<tuo-frontend>.onrender.com`
  - locale: `http://localhost:5173`

- **Additional Redirect URLs** (aggiungi tutte quelle che userai):
  - `https://<tuo-frontend>.onrender.com/reset-password`
  - `http://localhost:5173/reset-password`

> Nota: il backend calcola `redirectTo` usando `WEB_URL` (o l'Origin della request). Se non imposti `WEB_URL` su Render, il reset potrebbe fallire.

---

## 3) Env vars su Render
### Frontend (service web)
Imposta:
- `VITE_API_URL` = `https://<tuo-backend>.onrender.com`
- `VITE_SUPABASE_URL` = `<SUPABASE_URL>`
- `VITE_SUPABASE_ANON_KEY` = `<SUPABASE_ANON_KEY>`

### Backend (service api)
Imposta:
- `SUPABASE_URL` = `<SUPABASE_URL>`
- `SUPABASE_ANON_KEY` = `<SUPABASE_ANON_KEY>`
- `SUPABASE_SERVICE_ROLE_KEY` = `<service_role>` *(consigliato; **necessario** per Affiliate tracking in produzione)*
- `WEB_URL` = `https://<tuo-frontend>.onrender.com` *(consigliato per reset password)*
- `CORS_ORIGINS` = `https://<tuo-frontend>.onrender.com,http://localhost:5173`

Opzionale (bootstrap admin):
- `ADMIN_EMAIL` = email admin
- `ADMIN_PASSWORD` = password admin

Opzionale (DB per wizard):
- `DATABASE_URL` = connection string Postgres (può essere **Supabase Postgres**)

---

## 4) Creazione tabelle (SQL)
Se vuoi iniziare subito con un DB “affiliate-ready”, esegui il file:

- `supabase/schema.sql`

in Supabase → **SQL Editor**.

> Se invece usi il wizard “Diagnostica & Setup” dentro l’app, lo Step 2 crea solo le tabelle base (`system_config`, `affiliate_links`, `admin_setup_state`).

✅ **Aggiornamento MVP**: ora lo Step 2 del wizard crea anche `affiliate_clicks` e le viste/trigger per aggiornare `click_count`.

✅ **Update (Affiliate MVP killer)**

Il modulo “Affiliate Links” usa queste tabelle:

- `affiliate_links` (con `destination_url`, `slug`, `click_count`)
- `affiliate_clicks` (tracking)
- view `affiliate_clicks_daily_total` (mini chart)

Se esegui `supabase/schema.sql`, hai già tutto incluso (trigger che incrementa `click_count`).
Se usi invece il wizard “Diagnostica & Setup”, lo Step 2 ora crea anche `affiliate_clicks` e la view.

---

## 5) Note su Email Confirmation
Se in Supabase → Authentication → Providers → Email:
- **Confirm email** è ON, dopo signup l’utente deve confermare via email prima del login.
- Se è OFF, signup crea direttamente la sessione.

