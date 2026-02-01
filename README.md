# Task Manager

A full-stack multi-organization task management application built with NestJS, Angular, and Nx monorepo architecture.

## 🚀 Features

### 🔐 Authentication & Authorization

| Feature | Status | Description |
|---------|--------|-------------|
| User Registration | ✅ | Sign-up with email, password, first/last name |
| User Login | ✅ | Email/password authentication with JWT |
| JWT Token Management | ✅ | Secure token-based session handling |
| Password Security | ✅ | Bcrypt hashing with salt rounds |
| Password Strength Indicator | ✅ | Real-time strength meter during registration |
| Role-Based Access Control | ✅ | OWNER > ADMIN > VIEWER hierarchy with inheritance |
| Password Change | ✅ | Change password from settings (requires current password) |
| Password Reset | ✅ | Forgot password flow with token-based reset |

### 👥 Organization Management

| Feature | Status | Description |
|---------|--------|-------------|
| Create Organizations | ✅ | Users can create new organizations (become OWNER) |
| Organization Listing | ✅ | View all organizations user belongs to |
| Organization Details | ✅ | View specific organization with hierarchy |
| Organization Switching | ✅ | Switch between organizations with persistence |
| Update Organization | ✅ | Edit organization name (OWNER/ADMIN only) |
| Delete Organization | ✅ | Remove organization (OWNER only, no sub-orgs) |
| Hierarchical Organizations | ✅ | Parent/child organization support (backend) |

### 👤 Member Management

| Feature | Status | Description |
|---------|--------|-------------|
| View Members | ✅ | List all members with roles and join dates |
| Invite Users | ✅ | Token-based invitation system |
| Invitation Links | ✅ | Shareable links with copy to clipboard |
| Invitation Expiry | ✅ | 7-day expiration with countdown display |
| Accept Invitation | ✅ | Public signup flow via invitation token |
| Revoke Invitation | ✅ | Cancel pending invitations |
| Resend Invitation | ✅ | Regenerate expired invitations |

### ✅ Task Management

| Feature | Status | Description |
|---------|--------|-------------|
| Create Tasks | ✅ | Add tasks with title, description, priority, category |
| View Tasks | ✅ | List tasks in Kanban board format |
| Update Tasks | ✅ | Edit all task properties (ADMIN) or status only (VIEWER) |
| Delete Tasks | ✅ | Soft delete with restore capability |
| Restore Tasks | ✅ | Recover soft-deleted tasks (backend) |
| Kanban Board | ✅ | 3-column drag-and-drop (TODO, In Progress, Done) |
| Task Search | ✅ | Real-time search by title/description |
| Category Filter | ✅ | Filter by General, Work, Personal, Urgent |
| Sort Options | ✅ | Sort by date, priority, or alphabetically |
| Task Priority | ✅ | LOW, MEDIUM, HIGH, URGENT levels |
| Task Categories | ✅ | GENERAL, WORK, PERSONAL, URGENT |
| Task Assignment | 🔄 | Backend supports, UI dropdown planned |

### 📊 Analytics & Reporting

| Feature | Status | Description |
|---------|--------|-------------|
| Task Statistics | ✅ | Count by status (TODO, In Progress, Done) |
| Completion Rate | ✅ | Percentage with efficiency rating |
| Bar Charts | ✅ | Task distribution visualization |
| Doughnut Charts | ✅ | Completion rate pie chart |
| Theme-Aware Charts | ✅ | Colors adapt to light/dark mode |

### 📝 Audit Logging

| Feature | Status | Description |
|---------|--------|-------------|
| Automatic Logging | ✅ | All POST, PUT, DELETE operations logged |
| Audit Log Viewer | ✅ | View logs per organization |
| Log Details | ✅ | Action, resource, user, timestamp, details |
| Sensitive Data Sanitization | ✅ | Passwords and tokens redacted |

### 🎨 UI/UX Features

| Feature | Status | Description |
|---------|--------|-------------|
| Landing Page | ✅ | Marketing page with hero section and features |
| Dark Mode | ✅ | Light/Dark/System theme with persistence |
| Responsive Design | ✅ | Mobile-first layouts with Tailwind CSS |
| Keyboard Shortcuts | ✅ | Ctrl+N (new), Ctrl+K (search), Escape, Shift+? |
| Modal Dialogs | ✅ | Task, invite, delete confirmation modals |
| Form Validation | ✅ | Real-time validation with error messages |
| Loading States | ✅ | Spinners and skeleton loaders |
| Drag & Drop | ✅ | Angular CDK for Kanban board |
| Optimistic Updates | ✅ | Instant UI feedback with rollback on error |
| Collapsible Sidebar | ✅ | Responsive navigation |

### Legend
- ✅ Implemented and working
- 🔄 Partially implemented (UI or backend exists, needs integration)

---

## 🏗️ Architecture

### Why Nx Monorepo?

We chose Nx monorepo architecture for the following reasons:

| Benefit | Description |
|---------|-------------|
| **Code Sharing** | Share entities, interfaces, and enums between backend and frontend |
| **Consistent Tooling** | Single configuration for linting, testing, and building |
| **Atomic Changes** | Update shared code and all consumers in one commit |
| **Dependency Graph** | Nx understands project dependencies for smart rebuilds |
| **Scalability** | Easy to add new apps (mobile, admin panel) or libraries |
| **Type Safety** | End-to-end TypeScript with shared types |

### Project Structure
```
task-manager/
├── apps/
│   ├── api/                 # NestJS backend (port 3000)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── audit/           # Audit logging module
│   │   │   │   ├── invitations/     # Invitation system module
│   │   │   │   ├── organizations/   # Organization CRUD module
│   │   │   │   └── tasks/           # Task management module
│   │   │   └── migrations/          # TypeORM database migrations
│   └── dashboard/           # Angular frontend (port 4200)
│       └── src/app/
│           ├── core/                # Services, guards, interceptors
│           ├── features/            # Feature components
│           └── shared/              # Shared UI components
├── libs/
│   ├── auth/                # Authentication library (shared)
│   │   └── src/lib/
│   │       ├── guards/              # JWT, Roles, OrgRoles guards
│   │       ├── strategies/          # Passport JWT & Local strategies
│   │       └── dto/                 # Login, Register DTOs
│   └── data/                # Shared data library
│       └── src/lib/
│           ├── entities/            # TypeORM entities (User, Task, etc.)
│           ├── enums/               # Shared enums (Role, TaskStatus, etc.)
│           └── interfaces/          # TypeScript interfaces
├── docker-compose.yml       # PostgreSQL container setup
├── .env                     # Environment variables
└── nx.json                  # Nx workspace configuration
```

### Shared Libraries

#### `@task-manager/auth`
Authentication and authorization logic shared across the API:
- **Guards**: `JwtAuthGuard`, `LocalAuthGuard`, `RolesGuard`, `OrgRolesGuard`
- **Strategies**: Passport JWT and Local authentication strategies
- **Decorators**: `@CurrentUser()`, `@Roles()`, `@Public()`
- **DTOs**: `LoginDto`, `RegisterDto`, `ChangePasswordDto`

#### `@task-manager/data`
Shared data models and types:
- **Entities**: `User`, `Task`, `Organization`, `OrganizationMember`, `Invitation`, `AuditLog`
- **Enums**: `Role`, `TaskStatus`, `TaskPriority`, `TaskCategory`
- **Interfaces**: Type definitions for API responses

### Tech Stack

**Backend:**
- NestJS (Node.js framework)
- TypeORM (PostgreSQL ORM)
- Passport.js (JWT & Local strategies)
- class-validator (DTO validation)
- Swagger (API documentation)

**Frontend:**
- Angular 17+ (Standalone Components)
- Tailwind CSS (Styling)
- Angular Signals (State Management)
- Chart.js / ng2-charts (Analytics)
- Angular CDK (Drag & Drop)

**Infrastructure:**
- Nx Monorepo
- PostgreSQL Database
- Docker Compose
- Jest (Testing)
- ESLint (Linting)

---

## 📊 Data Model

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    DATA MODEL                                        │
└─────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────────────┐       ┌──────────────────┐
│      USER        │       │   ORGANIZATION_MEMBER    │       │   ORGANIZATION   │
├──────────────────┤       ├──────────────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)                  │       │ id (PK)          │
│ email (unique)   │◄──────│ userId (FK)              │       │ name             │
│ password         │       │ organizationId (FK)      │──────►│ parentId (FK)    │──┐
│ firstName        │       │ role (OWNER/ADMIN/VIEWER)│       │ createdAt        │  │
│ lastName         │       │ joinedAt                 │       │ updatedAt        │  │
│ resetToken       │       └──────────────────────────┘       └──────────────────┘  │
│ resetTokenExpiry │                                                 ▲              │
│ createdAt        │                                                 │              │
│ updatedAt        │                                                 └──────────────┘
└──────────────────┘                                                 (self-reference)
        │
        │
        ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│      TASK        │       │    INVITATION    │       │    AUDIT_LOG     │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ title            │       │ email            │       │ action           │
│ description      │       │ token (unique)   │       │ resourceType     │
│ status           │       │ role             │       │ resourceId       │
│ priority         │       │ organizationId(FK)│      │ organizationId(FK)│
│ category         │       │ invitedById (FK) │       │ userId (FK)      │
│ organizationId(FK)│      │ expiresAt        │       │ details (JSON)   │
│ createdById (FK) │       │ acceptedAt       │       │ ipAddress        │
│ assignedToId (FK)│       │ createdAt        │       │ userAgent        │
│ deletedAt        │       └──────────────────┘       │ timestamp        │
│ createdAt        │                                  └──────────────────┘
│ updatedAt        │
└──────────────────┘
```

### Schema Details

#### User Entity
```typescript
{
  id: UUID (Primary Key)
  email: string (unique, indexed)
  password: string (bcrypt hashed)
  firstName: string
  lastName: string
  resetToken: string | null (for password reset)
  resetTokenExpiry: Date | null
  createdAt: Date
  updatedAt: Date
}
```

#### Organization Entity
```typescript
{
  id: UUID (Primary Key)
  name: string
  parentId: UUID | null (self-reference for hierarchy)
  createdAt: Date
  updatedAt: Date
}
```

#### OrganizationMember Entity (Join Table)
```typescript
{
  id: UUID (Primary Key)
  userId: UUID (Foreign Key → User)
  organizationId: UUID (Foreign Key → Organization)
  role: 'OWNER' | 'ADMIN' | 'VIEWER'
  joinedAt: Date
}
// Unique constraint on (userId, organizationId)
```

#### Task Entity
```typescript
{
  id: UUID (Primary Key)
  title: string
  description: string | null
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  category: 'GENERAL' | 'WORK' | 'PERSONAL' | 'URGENT'
  organizationId: UUID (Foreign Key → Organization)
  createdById: UUID (Foreign Key → User)
  assignedToId: UUID | null (Foreign Key → User)
  deletedAt: Date | null (soft delete)
  createdAt: Date
  updatedAt: Date
}
```

#### Invitation Entity
```typescript
{
  id: UUID (Primary Key)
  email: string
  token: string (unique, for invitation link)
  role: 'OWNER' | 'ADMIN' | 'VIEWER'
  organizationId: UUID (Foreign Key → Organization)
  invitedById: UUID (Foreign Key → User)
  expiresAt: Date (7 days from creation)
  acceptedAt: Date | null
  createdAt: Date
}
```

#### AuditLog Entity
```typescript
{
  id: UUID (Primary Key)
  action: string (e.g., 'CREATE', 'UPDATE', 'DELETE')
  resourceType: string (e.g., 'Task', 'Organization')
  resourceId: string
  organizationId: UUID (Foreign Key → Organization)
  userId: UUID (Foreign Key → User)
  details: JSON (sanitized request/response data)
  ipAddress: string
  userAgent: string
  timestamp: Date
}
```

---

## 🔐 Access Control Implementation

### Role Hierarchy

```
OWNER (level 3) ─────────────────────────────────────────────┐
  │                                                          │
  │ • Full organization control                              │
  │ • Can delete organization                                │
  │ • Can invite users with any role (including OWNER)       │
  │ • Can manage all tasks                                   │
  │                                                          │
  ▼                                                          │
ADMIN (level 2) ─────────────────────────────────────────────┤
  │                                                          │
  │ • Can manage tasks (create, edit, delete)                │
  │ • Can invite users (ADMIN or VIEWER only)                │
  │ • Can view audit logs                                    │
  │ • Cannot delete organization                             │
  │                                                          │
  ▼                                                          │
VIEWER (level 1) ────────────────────────────────────────────┘
  │
  │ • Read-only access to tasks
  │ • Can update task STATUS only (not other fields)
  │ • Cannot invite users
  │ • Cannot view audit logs
```

### JWT Authentication Flow

```
┌─────────────┐                                    ┌─────────────┐
│   Client    │                                    │   Server    │
└──────┬──────┘                                    └──────┬──────┘
       │                                                  │
       │  1. POST /api/auth/login                         │
       │     { email, password }                          │
       │ ────────────────────────────────────────────────►│
       │                                                  │
       │                    2. Validate credentials       │
       │                       Hash password with bcrypt  │
       │                       Compare with stored hash   │
       │                                                  │
       │  3. Return JWT Token                             │
       │     { accessToken: "eyJhbG..." }                 │
       │ ◄────────────────────────────────────────────────│
       │                                                  │
       │  4. Store token in localStorage                  │
       │                                                  │
       │  5. GET /api/tasks                               │
       │     Authorization: Bearer eyJhbG...              │
       │ ────────────────────────────────────────────────►│
       │                                                  │
       │                    6. JwtAuthGuard extracts token│
       │                       Verify with JWT_SECRET     │
       │                       Attach user to request     │
       │                                                  │
       │                    7. OrgRolesGuard checks:      │
       │                       - User is org member?      │
       │                       - Has required role?       │
       │                                                  │
       │  8. Return data (or 401/403)                     │
       │ ◄────────────────────────────────────────────────│
       │                                                  │
```

### Guard Implementation

```typescript
// Request flow through guards:

@Controller('tasks')
@UseGuards(JwtAuthGuard, OrgRolesGuard)  // Applied to all routes
export class TasksController {
  
  @Post()
  @OrgRoles(Role.ADMIN)  // Requires ADMIN or higher
  create(@Body() dto: CreateTaskDto) { }
  
  @Get()
  @OrgRoles(Role.VIEWER)  // Requires VIEWER or higher (all roles)
  findAll(@Query('organizationId') orgId: string) { }
  
  @Delete(':id')
  @OrgRoles(Role.ADMIN)  // Requires ADMIN or higher
  delete(@Param('id') id: string) { }
}
```

### Permission Matrix

| Action | OWNER | ADMIN | VIEWER |
|--------|:-----:|:-----:|:------:|
| View tasks | ✅ | ✅ | ✅ |
| Update task status | ✅ | ✅ | ✅ |
| Create/edit/delete tasks | ✅ | ✅ | ❌ |
| Invite users | ✅ | ✅ | ❌ |
| Invite as OWNER | ✅ | ❌ | ❌ |
| Update organization | ✅ | ✅ | ❌ |
| Delete organization | ✅ | ❌ | ❌ |
| View audit logs | ✅ | ✅ | ❌ |

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL (or Docker)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd task-manager

# Install dependencies
npm install

# Start PostgreSQL with Docker
docker-compose up -d

# Run database migrations
npm run migration:run

# Start the development servers (in separate terminals)
npx nx serve api        # Backend on http://localhost:3000
npx nx serve dashboard  # Frontend on http://localhost:4200
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=admin
DATABASE_PASSWORD=password123
DATABASE_NAME=task_db

# TypeORM Settings
TYPEORM_SYNCHRONIZE=false    # Never true in production!
TYPEORM_LOGGING=true         # SQL query logging

# Application Settings
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-secure-secret-key-min-32-characters-long
JWT_EXPIRES_IN=1d
```

#### Generating a Secure JWT Secret

```bash
# Using OpenSSL
openssl rand -hex 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Docker Compose Setup

The `docker-compose.yml` provides a PostgreSQL instance:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: task_manager_db
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password123
      POSTGRES_DB: task_db
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data

volumes:
  pg_data:
```

### Development Commands

```bash
# Run API server
npx nx serve api

# Run Angular dashboard
npx nx serve dashboard

# Run both in parallel
npx nx run-many --target=serve --projects=api,dashboard --parallel

# Run tests
npx nx test api
npx nx test auth
npx nx test dashboard

# Run e2e tests
npx nx e2e api-e2e

# Build for production
npx nx build api --configuration=production
npx nx build dashboard --configuration=production

# Lint code
npx nx lint api
npx nx lint dashboard

# Database migrations
npm run migration:generate -- apps/api/src/migrations/MigrationName
npm run migration:run
npm run migration:revert
```

---

## 🔑 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ss123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "createdAt": "2026-01-31T10:00:00.000Z"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecureP@ss123"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

#### Get Profile
```http
GET /api/v1/auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Organization Endpoints

#### Create Organization
```http
POST /api/v1/organizations
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Company"
}
```

**Response (201 Created):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "name": "My Company",
  "createdAt": "2026-01-31T10:00:00.000Z",
  "members": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "role": "OWNER",
      "joinedAt": "2026-01-31T10:00:00.000Z"
    }
  ]
}
```

#### List User's Organizations
```http
GET /api/v1/organizations
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "My Company",
    "role": "OWNER",
    "memberCount": 5
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440002",
    "name": "Client Project",
    "role": "ADMIN",
    "memberCount": 3
  }
]
```

### Task Endpoints

#### Create Task
```http
POST /api/v1/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Implement login feature",
  "description": "Add JWT authentication",
  "status": "TODO",
  "priority": "HIGH",
  "category": "WORK",
  "organizationId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response (201 Created):**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440001",
  "title": "Implement login feature",
  "description": "Add JWT authentication",
  "status": "TODO",
  "priority": "HIGH",
  "category": "WORK",
  "organizationId": "660e8400-e29b-41d4-a716-446655440001",
  "createdById": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2026-01-31T10:00:00.000Z"
}
```

#### List Tasks
```http
GET /api/v1/tasks?organizationId=660e8400-e29b-41d4-a716-446655440001
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
[
  {
    "id": "770e8400-e29b-41d4-a716-446655440001",
    "title": "Implement login feature",
    "status": "TODO",
    "priority": "HIGH",
    "category": "WORK",
    "createdBy": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
]
```

#### Update Task
```http
PUT /api/v1/tasks/770e8400-e29b-41d4-a716-446655440001
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "IN_PROGRESS",
  "assignedToId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Invitation Endpoints

#### Create Invitation
```http
POST /api/v1/invitations
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "newuser@example.com",
  "role": "ADMIN",
  "organizationId": "660e8400-e29b-41d4-a716-446655440001"
}
```

**Response (201 Created):**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440001",
  "email": "newuser@example.com",
  "token": "abc123def456...",
  "role": "ADMIN",
  "expiresAt": "2026-02-07T10:00:00.000Z",
  "invitationUrl": "http://localhost:4200/invite/abc123def456..."
}
```

#### Accept Invitation
```http
POST /api/v1/invitations/accept
Content-Type: application/json

{
  "token": "abc123def456...",
  "password": "NewUserP@ss123",
  "firstName": "Jane",
  "lastName": "Smith"
}
```

### Audit Log Endpoints

#### Get Audit Logs (Paginated)
```http
GET /api/v1/audit-log?organizationId=660e8400-e29b-41d4-a716-446655440001&page=1&limit=10
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440001",
      "action": "CREATE",
      "resourceType": "Task",
      "resourceId": "770e8400-e29b-41d4-a716-446655440001",
      "user": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "details": {
        "title": "Implement login feature"
      },
      "timestamp": "2026-01-31T10:00:00.000Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

### API Endpoints Summary

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/api/v1/auth/register` | Public | - | Register new user |
| POST | `/api/v1/auth/login` | Public | - | Login and get JWT |
| GET | `/api/v1/auth/profile` | JWT | - | Get current user profile |
| POST | `/api/v1/auth/change-password` | JWT | - | Change password |
| POST | `/api/v1/auth/forgot-password` | Public | - | Request password reset |
| POST | `/api/v1/auth/reset-password` | Public | - | Reset password with token |
| POST | `/api/v1/organizations` | JWT | - | Create organization |
| GET | `/api/v1/organizations` | JWT | - | List user's organizations |
| GET | `/api/v1/organizations/:id` | JWT | VIEWER | Get organization details |
| PATCH | `/api/v1/organizations/:id` | JWT | ADMIN | Update organization |
| DELETE | `/api/v1/organizations/:id` | JWT | OWNER | Delete organization |
| GET | `/api/v1/organizations/:id/members` | JWT | VIEWER | List members |
| POST | `/api/v1/tasks` | JWT | ADMIN | Create task |
| GET | `/api/v1/tasks` | JWT | VIEWER | List tasks |
| PUT | `/api/v1/tasks/:id` | JWT | VIEWER | Update task |
| DELETE | `/api/v1/tasks/:id` | JWT | ADMIN | Soft delete task |
| POST | `/api/v1/invitations` | JWT | ADMIN | Create invitation |
| POST | `/api/v1/invitations/accept` | Public | - | Accept invitation |
| GET | `/api/v1/invitations/organization/:id` | JWT | ADMIN | List invitations |
| DELETE | `/api/v1/invitations/:id` | JWT | ADMIN | Revoke invitation |
| GET | `/api/v1/audit-log` | JWT | ADMIN | Get audit logs |
| GET | `/api/v1/auth/permissions/:orgId` | JWT | - | Get user permissions |
| GET | `/api/v1/auth/all-permissions` | JWT | - | List all permissions |

---

## 🔮 Future Considerations

### Granular Permission System (Implemented)

The system now supports fine-grained permissions beyond role-based access:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PERMISSION ARCHITECTURE                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────────────┐       ┌──────────────────┐
│   PERMISSION     │       │    ROLE_PERMISSION       │       │ USER_PERMISSION  │
├──────────────────┤       ├──────────────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)                  │       │ id (PK)          │
│ name             │◄──────│ permissionId (FK)        │       │ userId (FK)      │
│ description      │       │ role (OWNER/ADMIN/VIEWER)│       │ organizationId   │
│ resource         │       └──────────────────────────┘       │ permissionId (FK)│
│ action           │                                          │ granted (bool)   │
└──────────────────┘                                          └──────────────────┘
                                                              (User-level overrides)
```

**Resources:** `TASK`, `ORGANIZATION`, `MEMBER`, `AUDIT_LOG`, `INVITATION`

**Actions:** `CREATE`, `READ`, `UPDATE`, `DELETE`, `RESTORE`, `INVITE`, `MANAGE`

**Usage:**
```typescript
// Backend - granular permission check
@RequirePermission(PermissionResource.TASK, PermissionAction.CREATE)
@UseGuards(JwtAuthGuard, PermissionsGuard)
async createTask() { }

// Frontend - reactive permission check
canCreate = this.permissionsService.canCreateTasks; // Signal<boolean>
```

### Production Security Enhancements

| Enhancement | Priority | Description |
|-------------|----------|-------------|
| **JWT Refresh Tokens** | High | Short-lived access tokens (15min) + long-lived refresh tokens (7d) to minimize token theft impact |
| **CSRF Protection** | High | Double-submit cookie pattern for state-changing requests |
| **Rate Limiting** | High | Throttle login attempts (5/min), API requests (100/min per user) |
| **HTTP-Only Cookies** | Medium | Store tokens in HTTP-only cookies instead of localStorage |
| **Token Blacklisting** | Medium | Redis-backed blacklist for logout/password change invalidation |
| **Security Headers** | Medium | Helmet.js for CSP, HSTS, X-Frame-Options |
| **Input Sanitization** | Medium | DOMPurify for user-generated content |
| **Audit Log Encryption** | Low | Encrypt sensitive audit log details at rest |

### Performance & Scaling

| Optimization | Implementation |
|--------------|----------------|
| **Permission Caching** | Redis cache for role→permission mappings (TTL: 5min) |
| **User Permission Cache** | Per-request memoization + Redis for cross-request caching |
| **Database Indexes** | Compound indexes on `(userId, organizationId)` for membership lookups |
| **Connection Pooling** | TypeORM connection pool (min: 5, max: 20) |
| **Query Optimization** | Eager loading for common joins, pagination for large datasets |
| **CDN for Static Assets** | CloudFront/Cloudflare for Angular bundle distribution |

### Advanced Features Roadmap

| Feature | Complexity | Description |
|---------|------------|-------------|
| **Permission Delegation** | Medium | Allow OWNER to delegate specific permissions to users |
| **Time-Based Access** | Medium | Temporary elevated permissions with expiration |
| **IP Allowlisting** | Low | Restrict organization access by IP range |
| **SSO Integration** | High | SAML/OIDC support for enterprise authentication |
| **Multi-Factor Auth** | Medium | TOTP-based 2FA with backup codes |
| **API Key Auth** | Low | Service account authentication for integrations |
| **Webhook Events** | Medium | Real-time notifications for task/org changes |
| **Export/Import** | Low | Bulk task export (CSV/JSON) and import |

### Deployment Considerations

```bash
# Production environment variables
NODE_ENV=production
JWT_SECRET=<256-bit-random-secret>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://user:pass@host:5432/db?ssl=true
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20

# Redis (for caching/sessions)
REDIS_URL=redis://host:6379

# Security
CORS_ORIGINS=https://app.example.com
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
```

---

