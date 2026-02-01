import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UserOrganization } from './user-organization.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index('idx_user_email')
  email!: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName?: string;

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'reset_token', select: false })
  @Index('idx_user_reset_token')
  resetToken?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'reset_token_expiry', select: false })
  resetTokenExpiry?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => UserOrganization, (userOrg) => userOrg.user)
  organizationMemberships!: UserOrganization[];
}
