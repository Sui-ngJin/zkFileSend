# Backend Setup Guide

## 0. Prerequisites
- Node.js 18+
- Access to an Enoki project (project ID + private key)
- Google Cloud OAuth client (web application)
- Sponsor Sui keypair funded with enough SUI for gas

## 1. Install dependencies
```bash
cd backend
npm install
```

## 2. Configure environment
Copy `.env.example` to `.env` and fill in the fields:

- `PORT`: API server port (default 3001)
- `SUI_NETWORK` / `SUI_RPC_URL`: Sui network the sponsorship will run on
- `SPONSOR_PRIVATE_KEY`: Sui private key (suiprivkey... or base64) used to pay gas
- `SESSION_SECRET`: cookie signing secret
- `CORS_ORIGIN`: frontend origin (e.g., `http://localhost:5173`)

**Enoki + Google**
- `ENOKI_PROJECT_ID`, `ENOKI_PRIVATE_KEY`, optional `ENOKI_API_URL`
- `ENOKI_ENV`: `testnet` or `mainnet`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`: must match the value registered in Google console (default `http://localhost:3001/api/auth/google/callback`)
- `PUBLIC_BASE_URL`: external URL serving this backend (used to post login results back to the frontend)

## 3. Run the server
```bash
npm run dev
```
The server exposes:
- `GET /health`
- `GET /api/auth/google/start`
- `POST /api/auth/google/complete`
- `GET /api/auth/session`
- `POST /api/auth/logout`
- `POST /v1/transaction-blocks/sponsor`
- `POST /v1/transaction-blocks/sponsor/:digest`

Ensure your frontend `.env` has `VITE_BACKEND_BASE_URL` pointing to this server and fetch requests include credentials.

## 4. Enoki Sponsored Transaction Console Settings
When using Enoki's sponsored transaction controls, configure the following:

- **Allowed Address**: the sponsor Sui address (derived from `SPONSOR_PRIVATE_KEY`).
- **Allowed Move Call Targets**: include the zkSend bag functions:
  - `0x036fee67274d0d85c3532f58296abe0dee86b93864f1b2b9074be6adb388f138::zk_bag::init_claim`
  - `0x036fee67274d0d85c3532f58296abe0dee86b93864f1b2b9074be6adb388f138::zk_bag::claim`
  - `0x036fee67274d0d85c3532f58296abe0dee86b93864f1b2b9074be6adb388f138::zk_bag::finalize`

Include any additional zkSend functions you plan to use (for example `reclaim`) so the sponsor policy remains synchronized with on-chain usage.
