import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Organization } from './entities/organization.entity';
import { UserOrganization } from './entities/user-organization.entity';
import { Task } from './entities/task.entity';
import { AuditLog } from './entities/audit-log.entity';
import { Invitation } from './entities/invitation.entity';

export const entities = [User, Organization, UserOrganization, Task, AuditLog, Invitation];

@Module({
  imports: [TypeOrmModule.forFeature(entities)],
  exports: [TypeOrmModule],
})
export class DataModule {}
