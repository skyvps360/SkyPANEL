# SkyPANEL

A **full-stack VPS hosting management panel** built with React, TypeScript, Node.js, and PostgreSQL. SkyPANEL provides everything you need to provision, monitor, and manage virtual private servers while offering billing, DNS, support, and AI-powered features — all wrapped in a beautiful, brand-themed interface.

<p align="center">
  <img src="./icons/skyvps360-logo.png" alt="SkyPANEL logo" width="220" />
</p>

---

## Table of Contents

1. [Key Features](#key-features)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Getting Started](#getting-started)
6. [Deployment](#deployment)
7. [Configuration](#configuration)
8. [Code Quality &amp; Security](#code-quality--security)
9. [Documentation](#documentation)
10. [Contributing](#contributing)
11. [License](#license)

---

## Key Features

- **VPS Management** powered by VirtFusion API (create, rebuild, console, metrics).
- **DNS Management** with InterServer API (domains, records, plans).
- **Billing &amp; Payments** through PayPal with automated invoicing and transactions.
- **Support Centre** including ticketing, live chat, and Discord bot integration.
- **AI-Assisted Tools** (Google Gemini) for chat assistance and IDE code suggestions.
- **Monitoring &amp; Status** dashboards using BetterStack for uptime &amp; incident tracking.
- **Team &amp; Role Management** with fine-grained permissions.
- **Admin Suite** for settings, content management (blog, docs), SLA tracking, and more.
- **White-Label Friendly** — easily override colors &amp; assets via `brand-theme.md`.

## Architecture

SkyPANEL is a **monorepo** containing both the frontend and backend:

```text
client/    → React + Vite application (UI, hooks, pages, components)
server/    → Express API, services, cron jobs, database access (Drizzle ORM)
shared/    → Re-usable TypeScript types &amp; schema definitions
scripts/   → One-off maintenance &amp; migration utilities
migrations/→ SQL migrations managed by Drizzle
```

A high-level diagram:

```mermaid
flowchart LR
  subgraph Frontend (client)
    A[React SPA]
  end
  subgraph Backend (server)
    B[Express API]
    C[Services / Integrations]
    D[(PostgreSQL)]
  end
  A -- REST/WS --> B
  B -- ORM --> D
  C --> B
  C --> ExternalAPIs{{VirtFusion / InterServer / PayPal / Discord / BetterStack / Gemini}}
```

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, TanStack Query
- **Backend:** Node.js, Express, Drizzle ORM, PostgreSQL
- **DevOps:** Docker, PM2, Heroku (alternative), Docker Compose
- **CI / QA:** Codacy (quality &amp; security), Trivy (dependency scanning)
- **Integrations:** VirtFusion, InterServer DNS, PayPal, Discord, BetterStack, Google Gemini, noVNC

## Project Structure

```text
SkyPANEL/
├── client/           # Frontend source
│   ├── src/
│   ├── hooks/
│   ├── pages/
│   └── ...
├── server/           # Backend source
│   ├── routes/
│   ├── services/
│   ├── middleware/
│   └── ...
├── shared/           # Shared types & utils
├── scripts/          # Maintenance scripts
├── migrations/       # Database migrations
├── Dockerfile        # Docker build (multi-stage)
├── docker-compose.yml
├── pm2.config.cjs    # PM2 process manager (Linux/Mac)
├── pm2.config.windows.cjs
└── brand-theme.md    # Theming guide (colors, fonts, logo)
```

## Getting Started

### Prerequisites

- Node.js **18+**
- PostgreSQL **14+**
- pnpm / npm / yarn (choose one)
- Git

### Clone &amp; Install

```bash
# Clone
$ git clone https://github.com/skyvps360/SkyPANEL.git
$ cd SkyPANEL

# Install dependencies (workspace-root)
$ npm install
```

### Environment Variables

Copy the example files and fill in the required values:

```bash
cp .env.example .env           # Backend / server
cp client/.env.example client/.env # Frontend
```

Key variables include database credentials, VirtFusion / InterServer API keys, PayPal secrets, Discord tokens, BetterStack keys, and JWT secrets.

#### Example `.env`

```dotenv
# General
NODE_ENV=development
PORT=5000
HOST=0.0.0.0

# Database
DATABASE_URL=postgres://user:password@localhost:5432/skypanel

# Authentication
SESSION_SECRET=supersecretkey

# Branding
COMPANY_NAME=SkyVPS360
FRONTEND_URL=http://localhost:5173

# VirtFusion Integration
VIRTFUSION_API_URL=https://vdc.skyvps360.xyz/api/v1
VIRTFUSION_API_TOKEN=your_virtfusion_token_here

# InterServer DNS Integration
INTERSERVER_API_KEY=your_interserver_api_key_here

# PayPal Configuration
PAYPAL_CLIENT_ID=your_paypal_client_id_here
PAYPAL_SECRET=your_paypal_secret_here
VITE_PAYPAL_CLIENT_ID=$PAYPAL_CLIENT_ID
VITE_PAYPAL_SECRET=$PAYPAL_SECRET
VITE_PAYPAL_SANDBOX=true
VITE_PAYPAL_SANDBOX_CLIENT_ID=your_paypal_sandbox_client_id_here
VITE_PAYPAL_SANDBOX_SECRET=your_paypal_sandbox_secret_here

# Discord Bot
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_GUILD_ID=your_discord_guild_id_here
DISCORD_CHANNEL_ID=your_discord_channel_id_here
DISCORD_ROLE_ID=your_discord_role_id_here

# Google Gemini / AI
GOOGLE_AI_API_KEY=your_google_gemini_api_key_here

# BetterStack Monitoring
BETTERSTACK_API_KEY=your_betterstack_api_key_here
```

### Database &amp; Migrations

```bash
# Run migrations (Drizzle)
$ npm run migrate
```

> **Tip:** Review the `migrations/` directory to understand schema changes.

### Development Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend with ts-node &amp; nodemon |
| `npm run client` | Start Vite dev server on <http://localhost:5173> |
| `npm run build` | Build both client & backend (tsc, vite) |
| `npm run start` | Run compiled backend in production mode |
| `npm run build-restart:pm2:windows` | Windows build &amp; restart via PM2 |

Frontend requests are **proxied to the backend** during development (`vite.config.ts`).

### Linting &amp; Formatting

```bash
npm run lint   # Eslint
npm run format # Prettier
```

## Deployment

SkyPANEL supports multiple deployment strategies:

### Docker-Compose (recommended)

```bash
# Build & run
$ docker compose up --build -d
```

### PM2 (Virtual / Bare-metal)

1. Build project: `npm run build`
2. Launch processes: `pm2 start pm2.config.cjs` (or `.windows.cjs`)

### Heroku / Render / Railway

Use the provided `Procfile`:

```
web: npm run build && npm run start
```

Adjust environment variables in the platform dashboard.

## Configuration

All color tokens, fonts, and general styling live in **`brand-theme.md`**. Edit that file to align SkyPANEL with your brand. Shared utilities pick up these values at build-time.

## Code Quality &amp; Security

SkyPANEL is **continuously analysed by Codacy**. After each change the CI pipeline checks:

- Linting &amp; formatting (ESLint + Prettier)
- Types (TypeScript strict mode)
- Security (Trivy dependency scanning)

Local contributors can manually run:

```bash
npm run codacy
```

Refer to `.codacy/codacy.yaml` for custom rules.

## Documentation

Extensive docs live in `md-docs/`:

- **API Reference**
- **Deployment Guides**
- **Database Schema**
- **Integration Guides** (VirtFusion, PayPal, etc.)
- **Brand &amp; Design System**

A live version is served at `/docs` within the application.

## Contributing

1. Fork & clone the repo
2. Create a feature branch (`feat/my-cool-feature`)
3. Commit using [Conventional Commits](https://www.conventionalcommits.org/)
4. Ensure `npm test && npm run lint` pass
5. Open a pull request against `main`

Please read `CONTRIBUTING.md` (coming soon) for a detailed guide.

## License

Licensed under the **MIT License**. See [`LICENSE`](./LICENSE) for details. 