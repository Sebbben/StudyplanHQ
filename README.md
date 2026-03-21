## StudyPlanHQ

StudyPlanHQ is a Bun-based Next.js app for UiO students who want to explore courses, sketch semester plans, and save validated study paths.

### Stack

- Next.js 16
- Bun
- PostgreSQL
- Drizzle ORM
- Docker / Docker Compose
- Keycloak-ready OIDC auth foundation

### Quick Start

```bash
cp .env.example .env
docker compose up -d db
bun run db:push
bun run db:seed
bun dev
```

Open `http://localhost:3000`.

### Scripts

- `bun dev`
- `bun run lint`
- `bun run test`
- `bun run db:generate`
- `bun run db:migrate`
- `bun run db:push`
- `bun run db:seed`
- `bun run db:import-courses -- --file=./path/to/courses.json`

### Security Baseline

- Secure, signed session cookies
- Server-side authorization for saved plans
- Zod input validation
- Security headers via Next.js
- Dockerized app and PostgreSQL setup
