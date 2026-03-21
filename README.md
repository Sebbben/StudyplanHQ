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
- `bun run courses:fetch-ifi`
- `bun run courses:fetch-uio -- --listing=https://www.uio.no/studier/emner/matnat/math/`
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

### IFI Course Bootstrap

The course catalog import is intentionally split into two steps:

```bash
bun run courses:fetch-ifi
bun run db:import-courses -- --file=./data/ifi-courses.json
```

Useful flags:

- `bun run courses:fetch-ifi -- --limit=10`
- `bun run courses:fetch-ifi -- --course=IN1000,IN1010`
- `bun run courses:fetch-ifi -- --output=./data/ifi-courses.json`

The fetch step reads the public IFI course listing at UiO, downloads the linked course pages, normalizes them into one JSON file, and keeps prerequisite text plus simple course-code extraction for planner validation.

To import from another UiO subject listing, use the generic form:

```bash
bun run courses:fetch-uio -- --listing=https://www.uio.no/studier/emner/matnat/math/
bun run db:import-courses -- --file=./data/math-courses.json
```

Useful generic flags:

- `--department="Mathematics, Mechanics and Statistics"`
- `--listing=https://www.uio.no/studier/emner/matnat/fys/`
- `--output=./data/custom-courses.json`
