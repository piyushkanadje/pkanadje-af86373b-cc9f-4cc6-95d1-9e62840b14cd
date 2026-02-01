import axios, { AxiosError } from 'axios';

const API_BASE = '/api/v1';

// Test user data
const testTimestamp = Date.now();
const testUser = {
  email: `e2e-test-${testTimestamp}@test.com`,
  password: 'TestPassword123!',
  firstName: 'E2E',
  lastName: 'Tester',
};

let authToken: string;
let userId: string;
let organizationId: string;
let taskId: string;

describe('API E2E Tests', () => {
  describe('Health Check', () => {
    it('GET /api/v1 should return a message', async () => {
      const res = await axios.get(`${API_BASE}`);

      expect(res.status).toBe(200);
      expect(res.data).toEqual({ message: 'Hello API' });
    });
  });

  describe('Authentication', () => {
    it('POST /api/v1/auth/register should create a new user', async () => {
      const res = await axios.post(`${API_BASE}/auth/register`, testUser);

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('access_token');
      expect(res.data.user).toHaveProperty('id');
      expect(res.data.user.email).toBe(testUser.email);
      
      authToken = res.data.access_token;
      userId = res.data.user.id;
    });

    it('POST /api/v1/auth/register should reject duplicate email', async () => {
      try {
        await axios.post(`${API_BASE}/auth/register`, testUser);
        fail('Should have thrown an error');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(409);
      }
    });

    it('POST /api/v1/auth/login should authenticate user', async () => {
      const res = await axios.post(`${API_BASE}/auth/login`, {
        email: testUser.email,
        password: testUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('access_token');
      expect(res.data.user.email).toBe(testUser.email);
    });

    it('POST /api/v1/auth/login should reject invalid credentials', async () => {
      try {
        await axios.post(`${API_BASE}/auth/login`, {
          email: testUser.email,
          password: 'wrongpassword',
        });
        fail('Should have thrown an error');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });

    it('GET /api/v1/auth/profile should return user profile', async () => {
      const res = await axios.get(`${API_BASE}/auth/profile`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.email).toBe(testUser.email);
      expect(res.data.firstName).toBe(testUser.firstName);
    });

    it('GET /api/v1/auth/profile should reject without token', async () => {
      try {
        await axios.get(`${API_BASE}/auth/profile`);
        fail('Should have thrown an error');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });
  });

  describe('Organizations', () => {
    it('POST /api/v1/organizations should create an organization', async () => {
      const res = await axios.post(
        `${API_BASE}/organizations`,
        { name: `E2E Test Org ${testTimestamp}` },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(res.status).toBe(201);
      expect(res.data.organization).toHaveProperty('id');
      expect(res.data.organization.name).toBe(`E2E Test Org ${testTimestamp}`);
      
      organizationId = res.data.organization.id;
    });

    it('GET /api/v1/organizations should list user organizations', async () => {
      const res = await axios.get(`${API_BASE}/organizations`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);
    });

    it('GET /api/v1/organizations/:id should get organization details', async () => {
      const res = await axios.get(`${API_BASE}/organizations/${organizationId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(organizationId);
    });

    it('PATCH /api/v1/organizations/:id should update organization', async () => {
      const newName = `Updated Org ${testTimestamp}`;
      const res = await axios.patch(
        `${API_BASE}/organizations/${organizationId}`,
        { name: newName },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data.organization.name).toBe(newName);
    });

    it('GET /api/v1/organizations/:id/members should list members', async () => {
      const res = await axios.get(
        `${API_BASE}/organizations/${organizationId}/members`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);
      expect(res.data[0].role).toBe('OWNER');
    });
  });

  describe('Tasks', () => {
    it('POST /api/v1/tasks should create a task', async () => {
      const res = await axios.post(
        `${API_BASE}/tasks`,
        {
          title: `E2E Test Task ${testTimestamp}`,
          description: 'This is an E2E test task',
          status: 'TODO',
          priority: 'HIGH',
          category: 'WORK',
          organizationId: organizationId,
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(res.data.title).toBe(`E2E Test Task ${testTimestamp}`);
      
      taskId = res.data.id;
    });

    it('GET /api/v1/tasks should list tasks for organization', async () => {
      const res = await axios.get(
        `${API_BASE}/tasks?organizationId=${organizationId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);
    });

    it('PUT /api/v1/tasks/:id should update a task', async () => {
      const res = await axios.put(
        `${API_BASE}/tasks/${taskId}`,
        {
          status: 'IN_PROGRESS',
          organizationId: organizationId,
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data.status).toBe('IN_PROGRESS');
    });

    it('DELETE /api/v1/tasks/:id should soft delete a task', async () => {
      const res = await axios.delete(`${API_BASE}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { organizationId: organizationId },
      });

      expect(res.status).toBe(200);
      expect(res.data.message).toBe('Task deleted successfully');
    });
  });

  describe('Audit Logs', () => {
    it('GET /api/v1/audit-log should return paginated logs', async () => {
      const res = await axios.get(
        `${API_BASE}/audit-log?organizationId=${organizationId}&page=1&limit=10`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('data');
      expect(res.data).toHaveProperty('total');
      expect(res.data).toHaveProperty('page');
      expect(res.data).toHaveProperty('limit');
      expect(res.data).toHaveProperty('totalPages');
      expect(Array.isArray(res.data.data)).toBe(true);
    });
  });

  describe('Security - Unauthorized Access', () => {
    it('should reject requests without authentication', async () => {
      try {
        await axios.get(`${API_BASE}/organizations`);
        fail('Should have thrown an error');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });

    it('should reject requests with invalid token', async () => {
      try {
        await axios.get(`${API_BASE}/organizations`, {
          headers: { Authorization: 'Bearer invalid-token' },
        });
        fail('Should have thrown an error');
      } catch (error) {
        const axiosError = error as AxiosError;
        expect(axiosError.response?.status).toBe(401);
      }
    });
  });

  // Cleanup: Delete organization at the end
  describe('Cleanup', () => {
    it('DELETE /api/v1/organizations/:id should delete organization', async () => {
      const res = await axios.delete(
        `${API_BASE}/organizations/${organizationId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      expect(res.status).toBe(200);
      expect(res.data.message).toBe('Organization deleted successfully');
    });
  });
});
