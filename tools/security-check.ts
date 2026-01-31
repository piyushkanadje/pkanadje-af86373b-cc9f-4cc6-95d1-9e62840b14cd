/**
 * Multi-Tenancy Security Penetration Test
 * 
 * Validates that Organization Data is strictly isolated.
 * A user who is OWNER in "Org A" must have ZERO access to "Org B".
 * 
 * This is a PASS/FAIL gate for the entire project.
 * 
 * Usage: npx tsx tools/security-check.ts
 */

import axios, { AxiosInstance } from 'axios';
import chalk from 'chalk';
import { Client } from 'pg';

// ============================================================================
// Configuration
// ============================================================================

const API_BASE_URL = 'http://localhost:3000/api';
const TEST_TIMESTAMP = Date.now();

const ATTACKER_EMAIL = `attacker-${TEST_TIMESTAMP}@hack.com`;
const VICTIM_EMAIL = `victim-${TEST_TIMESTAMP}@legit.com`;
const PASSWORD = 'Password123!';

// ============================================================================
// Types
// ============================================================================

interface SecurityTestResult {
  name: string;
  passed: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  details: string;
}

// ============================================================================
// Test Tracking
// ============================================================================

const results: SecurityTestResult[] = [];
let criticalVulnerabilityFound = false;

function recordResult(
  name: string,
  passed: boolean,
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM',
  details: string
): void {
  results.push({ name, passed, severity, details });

  if (passed) {
    console.log(chalk.green(`  ✅ SECURE - ${name}`));
    console.log(chalk.gray(`     ${details}`));
  } else {
    const severityColor =
      severity === 'CRITICAL' ? chalk.bgRed.white.bold :
      severity === 'HIGH' ? chalk.red.bold :
      chalk.yellow;

    console.log(chalk.red(`  ❌ VULNERABLE - ${name}`));
    console.log(severityColor(`     [${severity}] ${details}`));

    if (severity === 'CRITICAL') {
      criticalVulnerabilityFound = true;
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

async function registerUser(email: string, password: string): Promise<{ token: string; userId: string }> {
  const client = createClient();
  const response = await client.post('/auth/register', {
    email,
    password,
    name: email.split('@')[0],
  });

  if (response.status !== 201) {
    throw new Error(`Failed to register ${email}: ${response.status} - ${JSON.stringify(response.data)}`);
  }

  // Decode JWT to get user ID
  const token = response.data.access_token;
  const payload = token.split('.')[1];
  const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());

  return { token, userId: decoded.sub };
}

async function createOrganization(name: string, ownerId: string): Promise<string> {
  const dbClient = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USER || 'admin',
    password: process.env.DATABASE_PASSWORD || 'password123',
    database: process.env.DATABASE_NAME || 'task_db',
  });

  await dbClient.connect();

  // Create organization
  const orgResult = await dbClient.query(
    `INSERT INTO organizations (id, name, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, NOW(), NOW())
     RETURNING id`,
    [name]
  );
  const organizationId = orgResult.rows[0].id;

  // Make user the owner
  await dbClient.query(
    `INSERT INTO user_organizations (id, user_id, organization_id, role, created_at)
     VALUES (gen_random_uuid(), $1, $2, 'OWNER', NOW())`,
    [ownerId, organizationId]
  );

  await dbClient.end();
  return organizationId;
}

async function createTaskDirectly(
  title: string,
  organizationId: string
): Promise<string> {
  const dbClient = new Client({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    user: process.env.DATABASE_USER || 'admin',
    password: process.env.DATABASE_PASSWORD || 'password123',
    database: process.env.DATABASE_NAME || 'task_db',
  });

  await dbClient.connect();

  const taskResult = await dbClient.query(
    `INSERT INTO tasks (id, title, status, organization_id, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, 'TODO', $2, NOW(), NOW())
     RETURNING id`,
    [title, organizationId]
  );

  await dbClient.end();
  return taskResult.rows[0].id;
}

// ============================================================================
// Security Tests
// ============================================================================

async function runSecurityTests(): Promise<void> {
  console.log(chalk.bold.red('\n🔐 MULTI-TENANCY SECURITY PENETRATION TEST'));
  console.log(chalk.gray(`   Target: ${API_BASE_URL}`));
  console.log(chalk.gray(`   Time: ${new Date().toISOString()}`));
  console.log(chalk.gray(`   Test ID: ${TEST_TIMESTAMP}\n`));

  // Verify API is running
  try {
    const healthCheck = await axios.get(`${API_BASE_URL}`, { timeout: 5000 });
    if (healthCheck.status !== 200) throw new Error('API not responding');
    console.log(chalk.green('✓ API is running\n'));
  } catch {
    console.log(chalk.red('✗ API is not running at ' + API_BASE_URL));
    process.exit(1);
  }

  // ========================================
  // Setup Phase
  // ========================================
  console.log(chalk.cyan('═══════════════════════════════════════════════════'));
  console.log(chalk.cyan.bold('  Phase 1: Setup Attack Scenario'));
  console.log(chalk.cyan('═══════════════════════════════════════════════════\n'));

  // Step 1: Create Attacker User
  console.log(chalk.yellow('👤 Step 1: Creating Attacker user...\n'));
  const attacker = await registerUser(ATTACKER_EMAIL, PASSWORD);
  console.log(chalk.gray(`  ✓ Attacker registered: ${ATTACKER_EMAIL}`));
  console.log(chalk.gray(`  ✓ Attacker ID: ${attacker.userId}`));

  // Step 2: Create Org A (Attacker is Owner)
  console.log(chalk.yellow('\n🏢 Step 2: Creating "Org A" (Attacker is OWNER)...\n'));
  const orgAId = await createOrganization('Org A - Attacker Owned', attacker.userId);
  console.log(chalk.gray(`  ✓ Created Org A: ${orgAId}`));
  console.log(chalk.gray(`  ✓ Attacker is OWNER of Org A`));

  // Step 3: Create Victim User & Org B
  console.log(chalk.yellow('\n👤 Step 3: Creating Victim user and "Org B"...\n'));
  const victim = await registerUser(VICTIM_EMAIL, PASSWORD);
  console.log(chalk.gray(`  ✓ Victim registered: ${VICTIM_EMAIL}`));

  const orgBId = await createOrganization('Org B - Victim Owned', victim.userId);
  console.log(chalk.gray(`  ✓ Created Org B: ${orgBId}`));
  console.log(chalk.gray(`  ✓ Victim is OWNER of Org B`));
  console.log(chalk.red.bold(`  ⚠ Attacker has NO membership in Org B`));

  // Step 4: Create sensitive task in Org B
  console.log(chalk.yellow('\n📋 Step 4: Creating sensitive task in Org B...\n'));
  const sensitiveTaskId = await createTaskDirectly('CONFIDENTIAL: Secret Project Alpha', orgBId);
  console.log(chalk.gray(`  ✓ Created sensitive task in Org B`));
  console.log(chalk.gray(`  ✓ Task ID: ${sensitiveTaskId}`));

  // Create attacker client
  const attackerClient = createClient(attacker.token);

  // ========================================
  // Attack Phase
  // ========================================
  console.log(chalk.cyan('\n═══════════════════════════════════════════════════'));
  console.log(chalk.cyan.bold('  Phase 2: Execute Attack Vectors'));
  console.log(chalk.cyan('═══════════════════════════════════════════════════\n'));

  // ----------------------------------------
  // Attack 1: Direct Access via orgId parameter
  // ----------------------------------------
  console.log(chalk.red.bold('🎯 ATTACK 1: Direct Access (Horizontal Privilege Escalation)\n'));
  console.log(chalk.gray('   Vector: GET /tasks?organizationId={org-b-id}'));
  console.log(chalk.gray('   Attacker tries to list tasks from Org B by guessing/knowing the ID\n'));

  const attack1Response = await attackerClient.get(`/tasks?organizationId=${orgBId}`);

  if (attack1Response.status === 403) {
    recordResult(
      'Attack 1: Direct Access via organizationId',
      true,
      'CRITICAL',
      `Request blocked with 403 Forbidden. Tenant isolation enforced.`
    );
  } else if (attack1Response.status === 200) {
    const tasksReturned = Array.isArray(attack1Response.data) ? attack1Response.data.length : 'unknown';
    recordResult(
      'Attack 1: Direct Access via organizationId',
      false,
      'CRITICAL',
      `🚨 BREACH! Attacker received 200 OK and got ${tasksReturned} task(s) from another tenant!`
    );
  } else {
    recordResult(
      'Attack 1: Direct Access via organizationId',
      true,
      'CRITICAL',
      `Request returned ${attack1Response.status}. Not a successful breach.`
    );
  }

  // ----------------------------------------
  // Attack 2: IDOR - Delete task by ID guessing
  // ----------------------------------------
  console.log(chalk.red.bold('\n🎯 ATTACK 2: IDOR - Delete Task by ID Guessing\n'));
  console.log(chalk.gray('   Vector: DELETE /tasks/{task-b-id}'));
  console.log(chalk.gray('   Attacker knows/guesses the task ID and tries to delete it\n'));

  const attack2Response = await attackerClient.delete(`/tasks/${sensitiveTaskId}`);

  if (attack2Response.status === 403 || attack2Response.status === 404) {
    recordResult(
      'Attack 2: IDOR Delete by Task ID',
      true,
      'CRITICAL',
      `Request blocked with ${attack2Response.status}. Task protected from cross-tenant deletion.`
    );
  } else if (attack2Response.status === 200 || attack2Response.status === 204) {
    recordResult(
      'Attack 2: IDOR Delete by Task ID',
      false,
      'CRITICAL',
      `🚨 CATASTROPHIC! Attacker successfully DELETED another tenant's data!`
    );
  } else {
    recordResult(
      'Attack 2: IDOR Delete by Task ID',
      attack2Response.status >= 400,
      'CRITICAL',
      `Request returned ${attack2Response.status}. ${attack2Response.status >= 400 ? 'Blocked.' : 'Potential breach!'}`
    );
  }

  // ----------------------------------------
  // Attack 3: IDOR - Update task in another org
  // ----------------------------------------
  console.log(chalk.red.bold('\n🎯 ATTACK 3: IDOR - Update Task in Another Org\n'));
  console.log(chalk.gray('   Vector: PUT /tasks/{task-b-id}'));
  console.log(chalk.gray('   Attacker tries to modify another tenant\'s task\n'));

  const attack3Response = await attackerClient.put(`/tasks/${sensitiveTaskId}`, {
    title: 'HACKED BY ATTACKER',
    status: 'DONE',
  });

  if (attack3Response.status === 403 || attack3Response.status === 404) {
    recordResult(
      'Attack 3: IDOR Update by Task ID',
      true,
      'CRITICAL',
      `Request blocked with ${attack3Response.status}. Task protected from cross-tenant modification.`
    );
  } else if (attack3Response.status === 200) {
    recordResult(
      'Attack 3: IDOR Update by Task ID',
      false,
      'CRITICAL',
      `🚨 CATASTROPHIC! Attacker successfully MODIFIED another tenant's data!`
    );
  } else {
    recordResult(
      'Attack 3: IDOR Update by Task ID',
      attack3Response.status >= 400,
      'CRITICAL',
      `Request returned ${attack3Response.status}. ${attack3Response.status >= 400 ? 'Blocked.' : 'Potential breach!'}`
    );
  }

  // ----------------------------------------
  // Attack 4: Access Audit Logs of another org
  // ----------------------------------------
  console.log(chalk.red.bold('\n🎯 ATTACK 4: Access Audit Logs of Another Org\n'));
  console.log(chalk.gray('   Vector: GET /audit-log?organizationId={org-b-id}'));
  console.log(chalk.gray('   Attacker tries to view audit trail of another organization\n'));

  const attack4Response = await attackerClient.get(`/audit-log?organizationId=${orgBId}`);

  if (attack4Response.status === 403) {
    recordResult(
      'Attack 4: Access Audit Logs Cross-Tenant',
      true,
      'HIGH',
      `Request blocked with 403 Forbidden. Audit logs protected.`
    );
  } else if (attack4Response.status === 200) {
    const logsReturned = Array.isArray(attack4Response.data) ? attack4Response.data.length : 'unknown';
    recordResult(
      'Attack 4: Access Audit Logs Cross-Tenant',
      false,
      'HIGH',
      `🚨 BREACH! Attacker accessed ${logsReturned} audit log(s) from another tenant!`
    );
  } else {
    recordResult(
      'Attack 4: Access Audit Logs Cross-Tenant',
      true,
      'HIGH',
      `Request returned ${attack4Response.status}. Not a successful breach.`
    );
  }

  // ----------------------------------------
  // Attack 5: Create task in another org
  // ----------------------------------------
  console.log(chalk.red.bold('\n🎯 ATTACK 5: Create Task in Another Org\n'));
  console.log(chalk.gray('   Vector: POST /tasks with organizationId={org-b-id}'));
  console.log(chalk.gray('   Attacker tries to inject data into another tenant\n'));

  const attack5Response = await attackerClient.post('/tasks', {
    title: 'MALICIOUS TASK INJECTED',
    organizationId: orgBId,
  });

  if (attack5Response.status === 403) {
    recordResult(
      'Attack 5: Create Task in Another Org',
      true,
      'CRITICAL',
      `Request blocked with 403 Forbidden. Cannot inject data into other tenants.`
    );
  } else if (attack5Response.status === 201) {
    recordResult(
      'Attack 5: Create Task in Another Org',
      false,
      'CRITICAL',
      `🚨 CATASTROPHIC! Attacker successfully INJECTED data into another tenant!`
    );
  } else {
    recordResult(
      'Attack 5: Create Task in Another Org',
      attack5Response.status >= 400,
      'CRITICAL',
      `Request returned ${attack5Response.status}. ${attack5Response.status >= 400 ? 'Blocked.' : 'Potential breach!'}`
    );
  }

  // ========================================
  // Verification Phase
  // ========================================
  console.log(chalk.cyan('\n═══════════════════════════════════════════════════'));
  console.log(chalk.cyan.bold('  Phase 3: Verify Data Integrity'));
  console.log(chalk.cyan('═══════════════════════════════════════════════════\n'));

  // Verify the sensitive task still exists and is unmodified
  const victimClient = createClient(victim.token);
  const verifyResponse = await victimClient.get(`/tasks?organizationId=${orgBId}`);

  if (verifyResponse.status === 200 && Array.isArray(verifyResponse.data)) {
    const sensitiveTask = verifyResponse.data.find((t: { id: string }) => t.id === sensitiveTaskId);
    
    if (sensitiveTask) {
      const isUnmodified = sensitiveTask.title === 'CONFIDENTIAL: Secret Project Alpha';
      console.log(chalk.green('  ✓ Sensitive task still exists'));
      console.log(chalk.gray(`    Title: ${sensitiveTask.title}`));
      console.log(chalk.gray(`    Status: ${sensitiveTask.status}`));
      
      if (!isUnmodified) {
        console.log(chalk.red.bold('  ⚠ WARNING: Task was modified during attack!'));
        criticalVulnerabilityFound = true;
      }
    } else {
      console.log(chalk.red.bold('  ❌ CRITICAL: Sensitive task was DELETED during attack!'));
      criticalVulnerabilityFound = true;
    }
  }

  // ========================================
  // Final Report
  // ========================================
  console.log(chalk.cyan('\n═══════════════════════════════════════════════════'));
  console.log(chalk.cyan.bold('  SECURITY ASSESSMENT REPORT'));
  console.log(chalk.cyan('═══════════════════════════════════════════════════\n'));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const criticalFails = results.filter((r) => !r.passed && r.severity === 'CRITICAL').length;

  console.log(chalk.white(`  Total Security Tests: ${results.length}`));
  console.log(chalk.green(`  Passed: ${passed}`));
  console.log(chalk.red(`  Failed: ${failed}`));
  console.log(chalk.red(`  Critical Vulnerabilities: ${criticalFails}`));

  if (criticalVulnerabilityFound || criticalFails > 0) {
    console.log(chalk.bgRed.white.bold('\n  ╔════════════════════════════════════════════════╗'));
    console.log(chalk.bgRed.white.bold('  ║    🚨 SECURITY GATE: FAILED                   ║'));
    console.log(chalk.bgRed.white.bold('  ╚════════════════════════════════════════════════╝\n'));
    
    console.log(chalk.red('  Multi-tenancy isolation is COMPROMISED.'));
    console.log(chalk.red('  DO NOT DEPLOY THIS APPLICATION.\n'));
    
    console.log(chalk.yellow('  Failed Tests:'));
    for (const fail of results.filter((r) => !r.passed)) {
      console.log(chalk.red(`    • [${fail.severity}] ${fail.name}`));
      console.log(chalk.gray(`      ${fail.details}`));
    }

    process.exit(1);
  } else {
    console.log(chalk.bgGreen.black.bold('\n  ╔════════════════════════════════════════════════╗'));
    console.log(chalk.bgGreen.black.bold('  ║    ✅ SECURITY GATE: PASSED                   ║'));
    console.log(chalk.bgGreen.black.bold('  ╚════════════════════════════════════════════════╝\n'));
    
    console.log(chalk.green('  Multi-tenancy isolation is ENFORCED.'));
    console.log(chalk.green('  All horizontal privilege escalation attacks blocked.'));
    console.log(chalk.green('  All IDOR attacks blocked.\n'));

    process.exit(0);
  }
}

// Run the security tests
runSecurityTests().catch((error) => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});
