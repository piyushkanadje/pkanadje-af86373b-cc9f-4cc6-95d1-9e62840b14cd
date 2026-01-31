/**
 * E2E Smoke Test Suite for Task Manager API
 * 
 * Validates Authentication, Role Inheritance, and CRUD operations
 * 
 * Usage: npx tsx tools/e2e-test-suite.ts
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import chalk from 'chalk';
import { Client } from 'pg';

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = 'http://localhost:3000/api';
const TEST_TIMESTAMP = Date.now();

const TEST_USERS = {
  owner: `owner-${TEST_TIMESTAMP}@qa.com`,
  admin: `admin-${TEST_TIMESTAMP}@qa.com`,
  viewer: `viewer-${TEST_TIMESTAMP}@qa.com`,
};

const TEST_ORG_NAME = 'QA Corp';

// ============================================================================
// Types
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  isSecurityCheck: boolean;
}

interface TestContext {
  ownerClient: AxiosInstance;
  adminClient: AxiosInstance;
  viewerClient: AxiosInstance;
  organizationId: string;
  taskId: string;
}

// ============================================================================
// Test Tracking
// ============================================================================

const results: TestResult[] = [];
let fatalSecurityBreach = false;

function recordResult(
  name: string,
  passed: boolean,
  expected: string,
  actual: string,
  isSecurityCheck = false
): void {
  results.push({ name, passed, expected, actual, isSecurityCheck });

  if (passed) {
    console.log(chalk.green(`  ✅ PASS - ${name}`));
    console.log(chalk.gray(`     Expected: ${expected} | Actual: ${actual}`));
  } else {
    console.log(chalk.red(`  ❌ FAIL - ${name}`));
    console.log(chalk.red(`     Expected: ${expected} | Actual: ${actual}`));

    if (isSecurityCheck) {
      fatalSecurityBreach = true;
      console.log(
        chalk.bgRed.white.bold(`  🚨 FATAL: SECURITY CHECK FAILED!`)
      );
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function createClient(token?: string): AxiosInstance {
  return axios.create({
    baseURL: API_BASE_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    validateStatus: () => true, // Don't throw on non-2xx
  });
}

async function getStatus(
  client: AxiosInstance,
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  data?: unknown
): Promise<number> {
  try {
    const response = await client[method](url, data);
    return response.status;
  } catch (error) {
    if (error instanceof AxiosError) {
      return error.response?.status || 500;
    }
    return 500;
  }
}

// ============================================================================
// Setup Functions
// ============================================================================

async function registerUser(email: string, password: string): Promise<string> {
  const client = createClient();
  const response = await client.post('/auth/register', {
    email,
    password,
    name: email.split('@')[0],
  });

  if (response.status !== 201) {
    throw new Error(`Failed to register ${email}: ${response.status}`);
  }

  return response.data.access_token;
}

async function setupDatabase(userIds: {
  owner: string;
  admin: string;
  viewer: string;
}): Promise<string> {
  const dbClient = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USER || 'admin',
    password: process.env.DATABASE_PASSWORD || 'password123',
    database: process.env.DATABASE_NAME || 'task_db',
  });

  await dbClient.connect();
  console.log(chalk.gray('  ✓ Connected to database'));

  // Create organization
  const orgResult = await dbClient.query(
    `INSERT INTO organizations (id, name, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, NOW(), NOW())
     RETURNING id`,
    [TEST_ORG_NAME]
  );
  const organizationId = orgResult.rows[0].id;
  console.log(chalk.gray(`  ✓ Created organization "${TEST_ORG_NAME}"`));

  // Assign roles
  const roles = [
    { id: userIds.owner, role: 'OWNER' },
    { id: userIds.admin, role: 'ADMIN' },
    { id: userIds.viewer, role: 'VIEWER' },
  ];

  for (const { id, role } of roles) {
    await dbClient.query(
      `INSERT INTO user_organizations (id, user_id, organization_id, role, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, NOW())`,
      [id, organizationId, role]
    );
  }
  console.log(chalk.gray('  ✓ Assigned roles: Owner, Admin, Viewer'));

  await dbClient.end();
  console.log(chalk.gray('  ✓ Database setup complete'));

  return organizationId;
}

async function getUserIdFromToken(token: string): Promise<string> {
  // Decode JWT to get user ID (simple base64 decode of payload)
  const payload = token.split('.')[1];
  const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
  return decoded.sub;
}

// ============================================================================
// Test Blocks
// ============================================================================

async function runBlock1_RoleInheritance(ctx: TestContext): Promise<void> {
  console.log(chalk.cyan('\n═══════════════════════════════════════════════════'));
  console.log(chalk.cyan.bold('  Block 1: Role Inheritance Validation (Crucial)'));
  console.log(chalk.cyan('═══════════════════════════════════════════════════\n'));

  // Test 1.1: GET /tasks (Requires Viewer) - Test inheritance
  console.log(chalk.yellow('📋 Test 1.1: GET /tasks?organizationId=... (Requires VIEWER)\n'));

  // Owner should have access (OWNER > VIEWER)
  const ownerGetStatus = await getStatus(
    ctx.ownerClient,
    'get',
    `/tasks?organizationId=${ctx.organizationId}`
  );
  recordResult(
    'Owner: GET /tasks (Role Inheritance: OWNER > VIEWER)',
    ownerGetStatus === 200,
    '200 OK',
    `${ownerGetStatus}`,
    false
  );

  // Admin should have access (ADMIN > VIEWER)
  const adminGetStatus = await getStatus(
    ctx.adminClient,
    'get',
    `/tasks?organizationId=${ctx.organizationId}`
  );
  recordResult(
    'Admin: GET /tasks (Role Inheritance: ADMIN > VIEWER)',
    adminGetStatus === 200,
    '200 OK',
    `${adminGetStatus}`,
    false
  );

  // Viewer should have access (Exact match)
  const viewerGetStatus = await getStatus(
    ctx.viewerClient,
    'get',
    `/tasks?organizationId=${ctx.organizationId}`
  );
  recordResult(
    'Viewer: GET /tasks (Exact Role Match: VIEWER)',
    viewerGetStatus === 200,
    '200 OK',
    `${viewerGetStatus}`,
    false
  );

  // Test 1.2: DELETE /tasks/:id (Requires Admin) - Security check
  console.log(chalk.yellow('\n🔒 Test 1.2: DELETE /tasks/:id (Requires ADMIN+)\n'));

  // First, create a task for the delete test
  const createResponse = await ctx.ownerClient.post('/tasks', {
    title: 'Task to Delete',
    organizationId: ctx.organizationId,
  });
  const tempTaskId = createResponse.data?.id || 'non-existent-id';

  // Viewer should NOT be able to delete (Security Check)
  const viewerDeleteStatus = await getStatus(
    ctx.viewerClient,
    'delete',
    `/tasks/${tempTaskId}`
  );
  recordResult(
    'Viewer: DELETE /tasks/:id -> FORBIDDEN (SECURITY CHECK)',
    viewerDeleteStatus === 403,
    '403 Forbidden',
    `${viewerDeleteStatus}`,
    true // This is a security check
  );

  // Clean up - delete the task as owner
  await ctx.ownerClient.delete(`/tasks/${tempTaskId}`);
}

async function runBlock2_FeatureVerification(ctx: TestContext): Promise<void> {
  console.log(chalk.cyan('\n═══════════════════════════════════════════════════'));
  console.log(chalk.cyan.bold('  Block 2: Feature Verification'));
  console.log(chalk.cyan('═══════════════════════════════════════════════════\n'));

  // Test 2.1: Create Task (Owner)
  console.log(chalk.yellow('🔨 Test 2.1: Owner creates task "Critical Bug"\n'));

  const createResponse = await ctx.ownerClient.post('/tasks', {
    title: 'Critical Bug',
    description: 'This is a critical bug that needs immediate attention',
    organizationId: ctx.organizationId,
  });

  const createPassed = createResponse.status === 201;
  ctx.taskId = createResponse.data?.id;

  recordResult(
    'Owner: POST /tasks (Create "Critical Bug")',
    createPassed,
    '201 Created',
    `${createResponse.status}`,
    false
  );

  if (ctx.taskId) {
    console.log(chalk.gray(`     Task ID: ${ctx.taskId}`));
  }

  // Test 2.2: Update Task (Admin)
  console.log(chalk.yellow('\n🔄 Test 2.2: Admin updates status to "IN_PROGRESS"\n'));

  const updateResponse = await ctx.adminClient.put(`/tasks/${ctx.taskId}`, {
    status: 'IN_PROGRESS',
  });

  recordResult(
    'Admin: PUT /tasks/:id (Update status to IN_PROGRESS)',
    updateResponse.status === 200,
    '200 OK',
    `${updateResponse.status}`,
    false
  );

  // Test 2.3: Read Tasks (Viewer)
  console.log(chalk.yellow('\n📋 Test 2.3: Viewer lists tasks\n'));

  const listResponse = await ctx.viewerClient.get(
    `/tasks?organizationId=${ctx.organizationId}`
  );

  const listPassed = listResponse.status === 200;
  const containsCriticalBug =
    Array.isArray(listResponse.data) &&
    listResponse.data.some(
      (task: { title: string }) => task.title === 'Critical Bug'
    );

  recordResult(
    'Viewer: GET /tasks (List tasks)',
    listPassed,
    '200 OK',
    `${listResponse.status}`,
    false
  );

  recordResult(
    'Viewer: Response contains "Critical Bug"',
    containsCriticalBug,
    'Task found in response',
    containsCriticalBug ? 'Task found' : 'Task NOT found',
    false
  );

  // Test 2.4: Audit Log Access (Owner)
  console.log(chalk.yellow('\n📜 Test 2.4: Owner calls GET /audit-log\n'));

  const auditOwnerResponse = await ctx.ownerClient.get(
    `/audit-log?organizationId=${ctx.organizationId}`
  );

  const auditPassed = auditOwnerResponse.status === 200;
  const isArray = Array.isArray(auditOwnerResponse.data);

  recordResult(
    'Owner: GET /audit-log (Access audit logs)',
    auditPassed,
    '200 OK',
    `${auditOwnerResponse.status}`,
    false
  );

  recordResult(
    'Owner: Audit response is an array',
    isArray,
    'Array',
    isArray ? 'Array' : typeof auditOwnerResponse.data,
    false
  );

  // Test 2.5: Audit Log Denied (Viewer) - Security Check
  console.log(chalk.yellow('\n🔒 Test 2.5: Viewer calls GET /audit-log\n'));

  const auditViewerResponse = await ctx.viewerClient.get(
    `/audit-log?organizationId=${ctx.organizationId}`
  );

  recordResult(
    'Viewer: GET /audit-log -> FORBIDDEN (SECURITY CHECK)',
    auditViewerResponse.status === 403,
    '403 Forbidden',
    `${auditViewerResponse.status}`,
    true // This is a security check
  );
}

// ============================================================================
// Main Execution
// ============================================================================

async function main(): Promise<void> {
  console.log(chalk.bold.blue('\n🧪 E2E Smoke Test Suite - Task Manager API'));
  console.log(chalk.gray(`   Target: ${API_BASE_URL}`));
  console.log(chalk.gray(`   Time: ${new Date().toISOString()}`));
  console.log(chalk.gray(`   Test ID: ${TEST_TIMESTAMP}\n`));

  // Verify API is running
  try {
    const healthCheck = await axios.get(`${API_BASE_URL}`, {
      timeout: 5000,
    });
    if (healthCheck.status !== 200) {
      throw new Error('API not responding');
    }
    console.log(chalk.green('✓ API is running\n'));
  } catch {
    console.log(chalk.red('✗ API is not running at ' + API_BASE_URL));
    console.log(chalk.yellow('  Please start the API with: npx nx serve api'));
    process.exit(1);
  }

  // ========================================
  // Setup Phase
  // ========================================
  console.log(chalk.cyan('═══════════════════════════════════════════════════'));
  console.log(chalk.cyan.bold('  Setup: Test Data Initialization'));
  console.log(chalk.cyan('═══════════════════════════════════════════════════\n'));

  console.log(chalk.yellow('📝 Registering test users...\n'));

  let ownerToken: string;
  let adminToken: string;
  let viewerToken: string;

  try {
    ownerToken = await registerUser(TEST_USERS.owner, 'Password123!');
    console.log(chalk.gray(`  ✓ Registered ${TEST_USERS.owner}`));

    adminToken = await registerUser(TEST_USERS.admin, 'Password123!');
    console.log(chalk.gray(`  ✓ Registered ${TEST_USERS.admin}`));

    viewerToken = await registerUser(TEST_USERS.viewer, 'Password123!');
    console.log(chalk.gray(`  ✓ Registered ${TEST_USERS.viewer}`));
  } catch (error) {
    console.log(chalk.red(`  ✗ Failed to register users: ${error}`));
    process.exit(1);
  }

  console.log(chalk.yellow('\n🏢 Setting up organization and roles...\n'));

  let organizationId: string;

  try {
    const userIds = {
      owner: await getUserIdFromToken(ownerToken),
      admin: await getUserIdFromToken(adminToken),
      viewer: await getUserIdFromToken(viewerToken),
    };

    organizationId = await setupDatabase(userIds);
  } catch (error) {
    console.log(chalk.red(`  ✗ Failed to setup database: ${error}`));
    process.exit(1);
  }

  // Create authenticated clients
  const ctx: TestContext = {
    ownerClient: createClient(ownerToken),
    adminClient: createClient(adminToken),
    viewerClient: createClient(viewerToken),
    organizationId,
    taskId: '',
  };

  // ========================================
  // Execute Test Blocks
  // ========================================

  try {
    await runBlock1_RoleInheritance(ctx);
    await runBlock2_FeatureVerification(ctx);
  } catch (error) {
    console.log(chalk.red(`\n  ✗ Test execution error: ${error}`));
  }

  // ========================================
  // Report Summary
  // ========================================
  console.log(chalk.cyan('\n═══════════════════════════════════════════════════'));
  console.log(chalk.cyan.bold('  Test Summary'));
  console.log(chalk.cyan('═══════════════════════════════════════════════════\n'));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const securityFails = results.filter((r) => r.isSecurityCheck && !r.passed);

  console.log(chalk.white(`  Total Tests: ${results.length}`));
  console.log(chalk.green(`  Passed: ${passed}`));
  console.log(chalk.red(`  Failed: ${failed}`));

  if (fatalSecurityBreach) {
    console.log(
      chalk.bgRed.white.bold('\n  🚨🚨🚨 FATAL: SECURITY VULNERABILITIES DETECTED 🚨🚨🚨')
    );
    console.log(chalk.red('\n  The following security checks failed:\n'));
    for (const fail of securityFails) {
      console.log(chalk.red(`    • ${fail.name}`));
      console.log(chalk.red(`      Expected: ${fail.expected}, Got: ${fail.actual}`));
    }
    console.log(
      chalk.red('\n  ⚠️  These failures indicate potential security vulnerabilities!')
    );
    console.log(chalk.red('  ⚠️  Do NOT deploy until these are resolved!\n'));
  } else if (failed > 0) {
    console.log(chalk.yellow('\n  ⚠️  Some tests failed:\n'));
    for (const fail of results.filter((r) => !r.passed)) {
      console.log(chalk.yellow(`    • ${fail.name}`));
      console.log(chalk.yellow(`      Expected: ${fail.expected}, Got: ${fail.actual}`));
    }
  } else {
    console.log(chalk.green.bold('\n  ✅ ALL TESTS PASSED'));
    console.log(chalk.green('  Role inheritance and security checks verified.\n'));
  }

  // Exit with appropriate code
  process.exit(fatalSecurityBreach ? 2 : failed > 0 ? 1 : 0);
}

// Run the test suite
main().catch((error) => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});
