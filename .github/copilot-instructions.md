# 🧑‍💻 SkyPANEL AI Coding Agent Instructions

## Project Architecture & Major Components
- **Monorepo Structure**: Key directories include `client/` (React/TypeScript frontend), `server/` (Node.js/Express backend), `scripts/` (automation, migrations), and `shared/` (common code).
- **Frontend**: Built with React 18, Vite, TailwindCSS, Shadcn/UI, and Wouter. State management via React Query. UI patterns favor composition and utility classes.
- **Backend**: Node.js + Express, TypeScript, PostgreSQL (via Drizzle ORM). API endpoints are RESTful and grouped by domain (user, billing, VirtFusion, support, admin).
- **VirtFusion Integration**: All VPS/server management is via VirtFusion API. Local `user.id` is mapped to VirtFusion's `extRelationId` for all API calls.
- **AI & Integrations**: Google Gemini for support, Discord bot/webhooks for notifications, BetterStack for monitoring, PayPal/SendGrid/SMTP2GO for billing and email.

## Developer Workflows
- **Setup**: Copy `.env.example` to `.env` and fill required secrets (see README for full list).
- **Database**: Use `npm run db:push` to apply migrations. Migrations are in `migrations/` and `scripts/`.
- **Admin User**: Create with `npx tsx scripts/create-admin-user.ts` (interactive prompt).
- **Development**: Start with `npm run dev` (Vite + backend). For production, use `npm run build` and `npm start`.
- **Docker**: Build with `docker-compose build` or `docker build ...`. Run with `docker-compose up -d` or `docker run ...`.
- **PM2**: Use `npm run build:restart` for full rebuild and PM2 restart.
- **Package Updates**: Run `npm run update-packages` then `npm install`.

## Project-Specific Conventions
- **API Key Auth**: Most API endpoints require Bearer token. Scopes are enforced (see README for details).
- **Error Handling**: Consistent JSON error format `{ error: { code, message, ... } }`.
- **Pagination**: Paginated endpoints use `?page=1&limit=20` and return `{ data, pagination }`.
- **Branding/Theming**: Custom themes via `brand-theme.md` and API endpoints. Multi-color support.
- **Discord Integration**: Two-way ticket sync and notifications. Discord bot config in `.env`.
- **Billing**: Credit-based, with PayPal integration and PDF exports. Admins can adjust credits manually.
- **Support System**: Tickets have departments, threaded messages, Discord sync, and AI suggestions.
- **Content Management**: Blog, docs, and FAQ managed via admin endpoints and markdown files in `md-docs/`.

## Integration Points & External Dependencies
- **VirtFusion**: All server actions, user sync, and resource stats via VirtFusion API. Configure in `.env`.
- **Google Gemini**: Used for AI-powered support responses.
- **Discord**: Bot and webhook integration for notifications and ticket sync.
- **BetterStack**: Monitoring and alerting integration.
- **PayPal/SendGrid/SMTP2GO**: Billing and email delivery.

## Key Files & Directories
- `README.md`: Full architecture, setup, and API docs
- `drizzle.config.ts`: Database ORM config
- `docker-compose.yml`, `Dockerfile`: Containerization
- `pm2.config.cjs`: PM2 process manager config
- `client/`, `server/`, `scripts/`, `shared/`: Main code
- `md-docs/`: Markdown docs for API, billing, integration, etc.
- `.env.example`: Reference for required environment variables

---

## Example: VirtFusion User Mapping
> All VirtFusion API calls use our local `user.id` as the `extRelationId` parameter for mapping users.

---

## AI Agent Guidance
- Always reference the README and `md-docs/` for domain-specific logic and integration details.
- When updating or generating code, follow the patterns and conventions described above.
- If unsure about a workflow or integration, check for scripts in `scripts/` and docs in `md-docs/`.

---

*If any section is unclear or missing, please request feedback to iterate and improve these instructions.*
