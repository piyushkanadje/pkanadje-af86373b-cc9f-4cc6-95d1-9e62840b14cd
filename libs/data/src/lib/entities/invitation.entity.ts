import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';
import { OrganizationRole } from '../enums/role.enum';
import { InvitationStatus } from '../enums/invitation-status.enum';

@Entity('invitations')
@Index('idx_invitation_token', ['token'], { unique: true })
@Index('idx_invitation_email', ['email'])
@Index('idx_invitation_org', ['organizationId'])
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  token: string;

  @Column({
    type: 'enum',
    enum: OrganizationRole,
    default: OrganizationRole.VIEWER,
  })
  role: OrganizationRole;

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  status: InvitationStatus;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'invited_by_id', type: 'uuid' })
  invitedById: string;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'invited_by_id' })
  invitedBy: User;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt: Date | null;
}
