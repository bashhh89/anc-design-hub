# ANC Design Hub

The design workflow for ANC Sales-support — briefs in, work out.

Standalone Next.js 14 + Prisma/Postgres app. Connects to the CRM to pull
Opportunity briefs. Six views (Dashboard, Board, Table, Calendar, Timeline,
Search), structured brief intake, comments, revisions, audit trail, soft-delete.

## Run
- `npm install`
- set `DATABASE_URL` (see `.env.example`)
- `npm run db:push && npm run db:seed`
- `npm run dev`

## Deploy
Dockerfile builds deterministically on EasyPanel. On boot the container syncs the
schema and seeds starter content only if the database is empty.
