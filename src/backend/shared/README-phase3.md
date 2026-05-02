# Phase 3 Backend Service Layer

This module set introduces Phase 3 architecture scaffolding while preserving existing routes.

## Modules

- `minting/` - pipeline orchestration definitions
- `token-gating/` - gate policy evaluation engine
- `mpc/` - MPC session and verification flow helpers
- `workers/` - background worker entrypoints (mint processing)
- `webhooks/` - inbound webhook parsing and signature helpers
- `db/` - repository abstraction (in-memory placeholder until Prisma wiring)
- `types/` - shared domain contracts

## Route compatibility

Existing routes remain untouched. New routes are exposed via wrappers under:

- `src/pages/api/webhooks/mpc.ts`
- `src/pages/api/workers/process-mint-job.ts`
- `src/pages/api/admin/token-gates/upsert.ts`
