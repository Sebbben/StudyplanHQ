# StudyPlanHQ Implementation Plan

This is the standing delivery reference for the app. Revisit it before each feature, after each feature, and whenever work drifts.

## Phase Order

1. Foundation: app structure, env validation, Docker, scripts
2. Data: PostgreSQL, Drizzle schema, seed/import flow
3. Public product: landing page, catalog, planner workspace
4. Protected product: Keycloak login, saved plans, ownership checks
5. Validation: prerequisite ordering, credit load, term availability
6. Quality: tests, security review, deploy readiness

## Working Rules

- Do not skip security reviews for convenience.
- Stop for user input when a decision changes auth, schema, session model, or public UX materially.
- Keep planner UX centered on semester planning, not generic CRUD.
- Avoid scope creep into degree-audit or timetable optimization.

## Done Criteria

- Anonymous users can browse courses and draft a plan.
- Authenticated users can save and manage plans.
- Validation explains common planning mistakes in plain language.
- The stack runs with Bun, PostgreSQL, and Docker.
- Critical flows have tests and explicit security checks.
