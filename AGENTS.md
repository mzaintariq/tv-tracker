# Agent Instructions

Read these files before making changes:

- docs/PRODUCT_REQUIREMENTS.md
- docs/BUILD_PLAN.md
- docs/DECISIONS.md
- docs/TASKS.md

Work on one phase at a time.

Rules:

- Use strict TypeScript.
- Do not use `any`.
- Keep secrets server-side.
- Never expose Supabase secret or service-role keys.
- Every database change must use a migration file.
- Every user-owned table must use Row Level Security.
- Do not implement later phases early.
- Run lint, type checking, tests and production build before completion.
- Summarize all changed files at the end of a task.
