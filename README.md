# Modena Play — Affiliate Platform MVP (Rebuild solido)

Monorepo `client/` + `server/` pronto per deploy su Render + Supabase.

## Requisiti env (Render / local)
### Server (Render: modenaplay-api)
- `DATABASE_URL` (Supabase → Database → connection string URI)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `JWT_SECRET`
- `CORS_ORIGINS` (es. https://modenaplay.com,http://localhost:5173)

### Client (Render: modenaplay-web)
- `VITE_API_URL` (URL API Render)
- opzionali: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (predisposti)

## Avvio locale
```bash
npm ci
npm -w server run dev
npm -w client run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:10000

## Setup Wizard (Admin)
1) Vai su `/login`
2) Login come Admin (credenziali in env)
3) Vai su `/admin/setup` e completa Step 1..5
4) Redirect automatico a `/admin/dashboard`

## Area minima User/Seller
- `/signup` è placeholder (UI pronta)
- `/user/dashboard` e `/seller/dashboard` sono placeholder protetti (richiede user.role corrispondente)
Nella prossima iterazione attiviamo signup/login reale via Supabase Auth + provisioning profili.


## User/Seller Auth (abilitato)
- Signup: `/signup` (scegli user/seller)
- Login: `/login` (scegli user/seller)
- Dashboard: `/user/dashboard` o `/seller/dashboard`

> Nota: se in Supabase è attiva la conferma email obbligatoria, la signup potrebbe non restituire sessione; per questo MVP conviene disattivarla in Auth settings.
