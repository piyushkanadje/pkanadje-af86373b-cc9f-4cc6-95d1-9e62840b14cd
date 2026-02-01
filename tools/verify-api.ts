/**
 * API Verification Script
 * Tests RBAC and Business Logic for Task Management API
 *
 * Prerequisites:
 * 1. PostgreSQL running with migrations applied
 * 2. API running at http://localhost:3000
 *
 * Run: npm run verify
 */

import axios, { AxiosInstance } from 'axios';
import { Client } from 'pg';

// Chalk v5 is ESM-only, so we use ANSI codes for CommonJS compatibility
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

const chalk = {
  red: (s: string) => `${colors.red}${s}${colors.reset}`,
  green: (s: string) => `${colors.green}${s}${colors.reset}`,
  yellow: (s: string) => `${colors.yellow}${s}${colors.reset}`,
  cyan: (s: string) => `${colors.cyan}${s}${colors.reset}`,
  gray: (s: string) => `${colors.gray}${s}${colors.reset}`,
  white: (s: string) => s,
  bold: {
    cyan: (s: string) => `${colors.bold}${colors.cyan}${s}${colors.reset}`,
    green: (s: string) => `${colors.bold}${colors.green}${s}${colors.reset}`,
    red: (s: string) => `${colors.bold}${colors.red}${s}${colors.reset}`,
  },
};

const API_BASE = 'http://localhost:3000/api/v1';

// ============================================================================
// Types
// ============================================================================

interface LoginResponse {
  access_token: string;
  user: { id: string; email: string };
}

interface Task {
  id: string;
  title: string;
  status: string;
  organizationId: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}

// ============================================================================
// Test State
// ============================================================================

const state = {
  ownerToken: '',
  adminToken: '',
  viewerToken: '',
  ownerId: '',
  adminId: '',
  viewerId: '',
  organizationId: '',
  taskId: '',
};

const results: TestResult[] = [];

// ============================================================================
// Utility Functions
// ============================================================================

function createClient(token?: string): AxiosInstance {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return axios.create({
    baseURL: API_BASE,
    headers,
    validateStatus: () => true, // Don't throw on any status
  });
}

function log(message: string): void {
  console.log(message);
}

function logSection(title: string): void {
  console.log('\n' + chalk.cyan('═'.repeat(60)));
  console.log(chalk.bold.cyan(`  ${title}`));
  console.log(chalk.cyan('═'.repeat(60)));
}

function logTest(name: string, passed: boolean, expected: string, actual: string): void {
  const icon = passed ? chalk.green('✅') : chalk.red('❌');
  const status = passed ? chalk.green('PASS') : chalk.red('FAIL');
  console.log(`${icon} ${status} - ${name}`);
  if (!passed) {
    console.log(chalk.gray(`   Expected: ${expected}`));
    console.log(chalk.gray(`   Actual: ${actual}`));
  }
  results.push({ name, passed, expected, actual });
}

async function expectStatus(
  name: string,
  promise: Promise<{ status: number; data?: unknown }>,
  expectedStatus: number
): Promise<{ status: number; data: unknown }> {
  const response = await promise;
  const passed = response.status === expectedStatus;
  logTest(name, passed, `Status ${expectedStatus}`, `Status ${response.status}`);
  return response as { status: number; data: unknown };
}

// ============================================================================
// Scenario 1: Setup Data
// ============================================================================

async function setupUsers(): Promise<void> {
  logSection('Scenario 1: Setup Data');
  log(chalk.yellow('\n📝 Registering test users...'));

  const client = createClient();
  const timestamp = Date.now();

  // Register users with unique emails (in case of re-runs)
  const users = [
    { email: `owner-${timestamp}@test.com`, role: 'owner' },
    { email: `admin-${timestamp}@test.com`, role: 'admin' },
    { email: `viewer-${timestamp}@test.com`, role: 'viewer' },
  ];

  for (const user of users) {
    const res = await client.post('/auth/register', {
      email: user.email,
      password: 'Test123!@#',
    });

    if (res.status === 201 || res.status === 200) {
      const data = res.data as LoginResponse;
      if (user.role === 'owner') {
        state.ownerToken = data.access_token;
        state.ownerId = data.user.id;
      } else if (user.role === 'admin') {
        state.adminToken = data.access_token;
        state.adminId = data.user.id;
      } else {
        state.viewerToken = data.access_token;
        state.viewerId = data.user.id;
      }
      log(chalk.green(`  ✓ Registered ${user.email}`));
    } else {
      log(chalk.red(`  ✗ Failed to register ${user.email}: ${JSON.stringify(res.data)}`));
      throw new Error(`Failed to register ${user.email}`);
    }
  }
}

async function setupOrganization(): Promise<void> {
  log(chalk.yellow('\n🏢 Setting up organization and roles via database...'));

  // Use a fixed organization ID for testing
  state.organizationId = '00000000-0000-0000-0000-000000000001';

  // Connect directly to database to set up test data
  const dbClient = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USER || 'admin',
    password: process.env.DATABASE_PASSWORD || 'password123',
    database: process.env.DATABASE_NAME || 'task_db',
  });

  try {
    await dbClient.connect();
    log(chalk.green('  ✓ Connected to database'));

    // Create organization
    await dbClient.query(`
      INSERT INTO organizations (id, name, created_at, updated_at)
      VALUES ($1, 'TechCorp', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `, [state.organizationId]);
    log(chalk.green('  ✓ Created organization "TechCorp"'));

    // Assign roles to users
    await dbClient.query(`
      INSERT INTO user_organizations (id, user_id, organization_id, role, created_at)
      VALUES
        (gen_random_uuid(), $1, $4, 'OWNER', NOW()),
        (gen_random_uuid(), $2, $4, 'ADMIN', NOW()),
        (gen_random_uuid(), $3, $4, 'VIEWER', NOW())
      ON CONFLICT DO NOTHING
    `, [state.ownerId, state.adminId, state.viewerId, state.organizationId]);
    log(chalk.green('  ✓ Assigned roles: Owner, Admin, Viewer'));

    await dbClient.end();
    log(chalk.green('  ✓ Database setup complete\n'));
  } catch (error) {
    log(chalk.red(`  ✗ Database setup failed: ${error}`));
    await dbClient.end().catch(() => {});
    throw error;
  }
}

// ============================================================================
// Scenario 2: Task Operations (Happy Path)
// ============================================================================

async function testTaskOperations(): Promise<void> {
  logSection('Scenario 2: Task Operations (Happy Path)');

  // Test 1: Owner creates a task
  log(chalk.yellow('\n🔨 Testing task creation (Owner)...'));
  const ownerClient = createClient(state.ownerToken);
  const createRes = await expectStatus(
    'Owner: POST /tasks (Create "Fix Server")',
    ownerClient.post('/tasks', {
      title: 'Fix Server',
      organizationId: state.organizationId,
      status: 'TODO',
    }),
    201
  );

  if (createRes.status === 201) {
    const task = createRes.data as Task;
    state.taskId = task.id;
    log(chalk.gray(`   Task ID: ${state.taskId}`));
  }

  // Test 2: Admin updates task status
  log(chalk.yellow('\n🔄 Testing task update (Admin)...'));
  const adminClient = createClient(state.adminToken);
  await expectStatus(
    'Admin: PUT /tasks/:id (Update status to IN_PROGRESS)',
    adminClient.put(`/tasks/${state.taskId}`, {
      status: 'IN_PROGRESS',
    }),
    200
  );

  // Test 3: Viewer lists tasks
  log(chalk.yellow('\n📋 Testing task listing (Viewer)...'));
  const viewerClient = createClient(state.viewerToken);
  const listRes = await expectStatus(
    'Viewer: GET /tasks?organizationId=... (List tasks)',
    viewerClient.get(`/tasks?organizationId=${state.organizationId}`),
    200
  );

  if (listRes.status === 200) {
    const tasks = listRes.data as Task[];
    const hasTask = Array.isArray(tasks) && tasks.some((t) => t.id === state.taskId);
    logTest(
      'Viewer can see the created task in list',
      hasTask,
      'Task visible in list',
      hasTask ? 'Task found' : 'Task not found'
    );
  }
}

// ============================================================================
// Scenario 3: Security Checks (Red Path)
// ============================================================================

async function testSecurityChecks(): Promise<void> {
  logSection('Scenario 3: Security Checks (Red Path)');

  const viewerClient = createClient(state.viewerToken);

  // Test 1: Viewer cannot delete tasks (CRITICAL)
  log(chalk.yellow('\n🔒 Testing delete restriction (Viewer)...'));
  await expectStatus(
    'Viewer: DELETE /tasks/:id -> FORBIDDEN (CRITICAL CHECK)',
    viewerClient.delete(`/tasks/${state.taskId}`),
    403
  );

  // Test 2: Viewer cannot create tasks
  log(chalk.yellow('\n🔒 Testing create restriction (Viewer)...'));
  await expectStatus(
    'Viewer: POST /tasks -> FORBIDDEN',
    viewerClient.post('/tasks', {
      title: 'Unauthorized Task',
      organizationId: state.organizationId,
      status: 'TODO',
    }),
    403
  );

  // Test 3: Viewer can only update status (not other fields)
  log(chalk.yellow('\n🔒 Testing update field restriction (Viewer)...'));

  // First, let's create another task to test partial updates
  const ownerClient = createClient(state.ownerToken);
  const newTaskRes = await ownerClient.post('/tasks', {
    title: 'Test Update Restrictions',
    organizationId: state.organizationId,
    status: 'TODO',
  });

  if (newTaskRes.status === 201) {
    const newTask = newTaskRes.data as Task;

    // Viewer tries to update title (should fail)
    await expectStatus(
      'Viewer: PUT /tasks/:id {title} -> FORBIDDEN',
      viewerClient.put(`/tasks/${newTask.id}`, {
        title: 'Hacked Title',
      }),
      403
    );

    // Viewer tries to update status only (should succeed)
    await expectStatus(
      'Viewer: PUT /tasks/:id {status only} -> OK',
      viewerClient.put(`/tasks/${newTask.id}`, {
        status: 'DONE',
      }),
      200
    );
  }
}

// ============================================================================
// Scenario 4: Audit Log
// ============================================================================

async function testAuditLog(): Promise<void> {
  logSection('Scenario 4: Audit Log');

  // Test 1: Owner can access audit log
  log(chalk.yellow('\n📜 Testing audit log access (Owner)...'));
  const ownerClient = createClient(state.ownerToken);
  await expectStatus(
    'Owner: GET /audit-log?organizationId=... -> OK',
    ownerClient.get(`/audit-log?organizationId=${state.organizationId}`),
    200
  );

  // Test 2: Admin can access audit log
  log(chalk.yellow('\n📜 Testing audit log access (Admin)...'));
  const adminClient = createClient(state.adminToken);
  await expectStatus(
    'Admin: GET /audit-log?organizationId=... -> OK',
    adminClient.get(`/audit-log?organizationId=${state.organizationId}`),
    200
  );

  // Test 3: Viewer cannot access audit log
  log(chalk.yellow('\n🔒 Testing audit log restriction (Viewer)...'));
  const viewerClient = createClient(state.viewerToken);
  await expectStatus(
    'Viewer: GET /audit-log?organizationId=... -> FORBIDDEN',
    viewerClient.get(`/audit-log?organizationId=${state.organizationId}`),
    403
  );
}

// ============================================================================
// Summary
// ============================================================================

function printSummary(): void {
  logSection('Test Summary');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`\n  Total: ${total} | ${chalk.green(`Passed: ${passed}`)} | ${chalk.red(`Failed: ${failed}`)}\n`);

  if (failed === 0) {
    console.log(chalk.bold.green('  ✅ ALL SYSTEMS OPERATIONAL'));
    console.log(chalk.green('  RBAC and Business Logic verified successfully.\n'));
  } else {
    console.log(chalk.bold.red('  ❌ SECURITY VULNERABILITY DETECTED'));
    console.log(chalk.red('  The following tests failed:\n'));
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(chalk.red(`    • ${r.name}`));
        console.log(chalk.gray(`      Expected: ${r.expected}`));
        console.log(chalk.gray(`      Actual: ${r.actual}\n`));
      });
  }
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log(chalk.bold.cyan('\n🔍 Task Manager API Verification Script'));
  console.log(chalk.gray(`   Target: ${API_BASE}`));
  console.log(chalk.gray(`   Time: ${new Date().toISOString()}\n`));

  try {
    // Check if API is running
    const client = createClient();
    const healthCheck = await client.get('/').catch(() => null);
    if (!healthCheck) {
      console.log(chalk.red('\n❌ API is not running at ' + API_BASE));
      console.log(chalk.yellow('   Please start the API with: npx nx serve api\n'));
      process.exit(1);
    }

    // Run all scenarios
    await setupUsers();
    await setupOrganization();

    await testTaskOperations();
    await testSecurityChecks();
    await testAuditLog();

    printSummary();

    // Exit with appropriate code
    const failed = results.filter((r) => !r.passed).length;
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error(chalk.red('\n❌ Verification failed with error:'));
    console.error(error);
    process.exit(1);
  }
}

main();
