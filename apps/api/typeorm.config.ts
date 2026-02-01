import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '@task-manager/data';
import { Organization } from '@task-manager/data';
import { UserOrganization } from '@task-manager/data';
import { Task } from '@task-manager/data';
import { AuditLog } from '@task-manager/data'; 

config({ path: '.env' });

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'admin',
  password: process.env.DATABASE_PASSWORD || 'password123',
  database: process.env.DATABASE_NAME || 'task_db',
  entities: [User, Organization, UserOrganization, Task, AuditLog],
  migrations: ['apps/api/src/migrations/*.ts'],
  migrationsTableName: 'migrations',
});
