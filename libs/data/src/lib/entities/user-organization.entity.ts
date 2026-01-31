import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Organization } from './organization.entity';
import { OrganizationRole } from '../enums/role.enum';

@Entity('user_organizations')
@Unique('uq_user_org', ['userId', 'organizationId'])
@Index('idx_user_org_user', ['userId'])
@Index('idx_user_org_org', ['organizationId'])
export class UserOrganization {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({
    type: 'enum',
    enum: OrganizationRole,
    default: OrganizationRole.VIEWER,
  })
  role!: OrganizationRole;

  @ManyToOne(() => User, (user) => user.organizationMemberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Organization, (org) => org.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization!: Organization;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
