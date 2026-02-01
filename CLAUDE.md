# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Nx-based monorepo for a task management application with multi-organization support. It consists of a NestJS backend API and an Angular frontend dashboard.

## Architecture

### Monorepo Structure
```
task-manager/
├── apps/
│   ├── api/              # NestJS backend (port 3000)
│   └── dashboard/        # Angular frontend (port 4200)
├── libs/
│   ├── auth/             # Authentication module (JWT, Passport, RBAC)
│   └── data/             # Database entities, enums, interfaces
```

### Path Aliases
- `@task-manager/auth` → `libs/auth/src/index.ts`
- `@task-manager/data` → `libs/data/src/index.ts`

### Database
- PostgreSQL with TypeORM
- Entities: User, Organization, UserOrganization, Task
- Migrations in `apps/api/src/migrations/`

## Common Commands

```bash
# Development
npx nx serve api                    # Start API server
npx nx serve dashboard              # Start Angular app (proxies to API)

# Testing
npx nx test auth                    # Run auth library tests
npx nx test api                     # Run API tests
npx nx e2e api-e2e                  # Run API e2e tests

# Build
npx nx build api                    # Production build
npx nx build dashboard              # Angular production build

# Linting
npx nx lint api
npx nx lint auth

# Database
npm run migration:generate -- apps/api/src/migrations/MigrationName
npm run migration:run
npm run migration:revert

# Docker
docker-compose up -d                # Start PostgreSQL
```

## Authentication System

### JWT Flow
1. User authenticates via `POST /api/v1/auth/login` with email/password
2. Server validates credentials and returns JWT token
3. Client includes token in `Authorization: Bearer <token>` header
4. JwtAuthGuard validates token and populates `request.user`

### Role-Based Access Control (RBAC)

**Role Hierarchy**: OWNER (3) > ADMIN (2) > VIEWER (1)

Role inheritance allows higher roles to access lower-role routes:
- OWNER can access ADMIN and VIEWER routes
- ADMIN can access VIEWER routes
- VIEWER can only access VIEWER routes

**Usage**:
```typescript
@Get('org/:organizationId/resource')
@UseGuards(JwtAuthGuard, OrgRolesGuard)
@OrgRoles(OrganizationRole.ADMIN)
async getResource(@Request() req) {
  // req.user - authenticated user
  // req.organizationId - extracted org context
  // req.userOrgRole - user's role in that org
}
```

### Key Auth Files
- `libs/auth/src/lib/auth.service.ts` - Core auth logic
- `libs/auth/src/lib/guards/org-roles.guard.ts` - RBAC with inheritance
- `libs/auth/src/lib/strategies/jwt.strategy.ts` - JWT validation
- `libs/auth/src/lib/strategies/local.strategy.ts` - Login validation

## Environment Variables

Required in `.env`:
```
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=admin
DATABASE_PASSWORD=password123
DATABASE_NAME=task_db
JWT_SECRET=your-secure-secret-key
JWT_EXPIRES_IN=1d
```

## API Endpoints

### Auth
- `POST /api/v1/auth/register` - Create new user
- `POST /api/v1/auth/login` - Authenticate and get JWT
- `GET /api/v1/auth/profile` - Get current user (requires JWT)
- `GET /api/v1/auth/org/:organizationId/admin-test` - Test ADMIN access

### Protected Routes Pattern
All organization-specific routes should:
1. Use `JwtAuthGuard` first (authenticates user)
2. Use `OrgRolesGuard` second (checks org membership + role)
3. Include `:organizationId` in params or body
