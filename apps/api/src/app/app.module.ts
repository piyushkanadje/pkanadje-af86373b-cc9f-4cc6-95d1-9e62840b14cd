import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataModule } from '@task-manager/data';
import { AuthModule } from '@task-manager/auth';
import { TasksModule } from './tasks/tasks.module';
import { AuditModule } from './audit/audit.module';
import { InvitationsModule } from './invitations/invitations.module';
import { OrganizationsModule } from './organizations/organizations.module';
import databaseConfig from '../config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) =>
        configService.get('database'),
      inject: [ConfigService],
    }),
    DataModule,
    AuthModule,
    TasksModule,
    AuditModule,
    InvitationsModule,
    OrganizationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
