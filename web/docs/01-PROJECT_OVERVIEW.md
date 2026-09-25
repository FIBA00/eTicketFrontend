# Project Overview

## What this is
Digital e-ticketing system for Ethiopian bus stations. Offline-first, multi-station, role-based.

## Origin
- Proposal doc (Afaan Oromo + English PDF) from client
- AI-generated frontend MVP (React + Express + Drizzle) — works but no auth, no roles, flat data
- Our v2 backend (Express + Drizzle + JWT + roles) — full auth, stations, vehicles, routes
- This integration: auth feature added to AI frontend, connected to v2 backend

## Current state
| Component | Status | Location |
|-----------|--------|----------|
| Backend v2 (auth, users, stations, vehicles, routes) | Done | `e-ticket-v2/` |
| Frontend (AI) + auth integration | Done | `e-ticket-full/` |
| Ticket issuing with seats | Not started | — |
| Offline sync (SQLite queue) | Not started | — |
| Finance (audit, commission) | Not started | — |
| Station display board | Not started | — |
| Android app | Not started | — |
| Thermal printing | Not started | — |

## Key decisions log
| Date | Decision | Why |
|------|----------|-----|
| 2026-09-25 | Backend: Express over NestJS | Familiarity, speed, Nest philosophy without lock-in |
| 2026-09-25 | ORM: Drizzle over Prisma | Plain TS schema, no codegen, Zod-friendly |
| 2026-09-25 | DB: PostgreSQL over MySQL | JSONB for sync, row versioning |
| 2026-09-25 | Money: integer cents | No float errors in finance |
| 2026-09-25 | Auth: JWT access + refresh rotation | Stateless, revocable, mobile-friendly |
| 2026-09-25 | Frontend: integrate auth into AI frontend | AI frontend works, has offline queue pattern |
