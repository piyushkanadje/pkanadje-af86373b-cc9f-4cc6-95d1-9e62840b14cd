import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  User,
  Organization,
  UserOrganization,
  Invitation,
} from '@task-manager/data';
import { AuthModule } from '@task-manager/auth';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Organization, UserOrganization, Invitation]),
    AuthModule,
    AuditModule,
  ],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
