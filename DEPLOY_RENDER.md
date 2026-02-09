# Deploy su Render (Modena Play)

Questa repo contiene 2 servizi separati:

- **modenaplay-web**: frontend Vite/React (Static Site) in `client/`
- **modenaplay-api**: backend Node/Express in `server/`

## Perché questa patch
Render, quando clona la repo, prova a fare un `npm install` automatico nella **root**.
Se la root è configurata come workspace, Render installa anche `client/` e `server/` dentro `node_modules` in root e può causare errori tipo `ENOTEMPTY` o crash npm.

In questa versione:
- la root **non** usa workspaces
- è presente `.npmrc` che forza `registry.npmjs.org` e retry più robusti

## Render: settaggi consigliati

### 1) modenaplay-web (Static Site)
- Root Directory: `client`
- Build Command: `npm install --include=dev --no-audit --no-fund && npm run build`
- Publish Directory: `dist`

### 2) modenaplay-api (Web Service)
- Root Directory: `server`
- Build Command: `npm install --include=dev --no-audit --no-fund && npm run build`
- Start Command: `npm run start`

### Node
Imposta `NODE_VERSION=20.18.1` su entrambi (Environment).

### Registry NPM (opzionale)
Se vuoi, puoi aggiungere anche:
- `NPM_CONFIG_REGISTRY=https://registry.npmjs.org/`

ma `.npmrc` già lo imposta.

## Environment minime per API
- `DATABASE_URL` (Neon)
- `JWT_SECRET`
- `CORS_ORIGINS=https://modenaplay-web.onrender.com`
- `NODE_ENV=production`
