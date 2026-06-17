# Project: CDC Pre-production Audit and Site Verification

## Architecture
- **Tech Stack**: Next.js 16 (App Router), Prisma, PostgreSQL (local and Supabase), ESLint, Zod.
- **Modules**: Contacts, Tasks, Mails, Questions, Agenda, Reports, Permanences.
- **Dynamic Field Configurations**: Managed via `FieldConfig` in database, queried dynamically via `getModuleFields` API to toggle and order fields dynamically in the UI.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | R1. Exploration & Linting | Static analysis, linting, and initial TypeScript compilation checks | none | DONE |
| 2 | R2. Schema & DB Integrity | Align Prisma, Zod schemas, local database, and Supabase; verify `FieldConfig` completeness | M1 | DONE |
| 3 | R3. Contact Functional Validation | Implement/fix creation and edit forms, profession field, and correct address rendering | M2 | DONE |
| 4 | R4. E2E Verification & Build | Verify final production build compilation and execute complete validation tests | M3 | DONE |

## Interface Contracts
### Contacts Module ↔ Database
- Contact creation and update schemas.
- `profession` column in schema matches Zod validation.
- Fields mapping logic for address components to prevent raw/unmapped address leaks.

## Code Layout
- `src/app/contacts/` - Contacts pages, lists, details, creation, and forms.
- `src/lib/` - Shared helpers, including `fields.ts` for dynamic fields and `prisma.ts` for database.
- `prisma/` - Schema definitions and migrations.
