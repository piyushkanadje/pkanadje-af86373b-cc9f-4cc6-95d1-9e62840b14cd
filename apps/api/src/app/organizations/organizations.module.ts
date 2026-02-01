import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization, UserOrganization } from '@task-manager/data';
import { AuthModule } from '@task-manager/auth';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization, UserOrganization]),
    AuthModule,
    AuditModule,
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
