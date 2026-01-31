import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  User,
  Organization,
  UserOrganization,
  OrganizationRole,
  Invitation,
  InvitationStatus,
} from '@task-manager/data';
import { JwtService } from '@nestjs/jwt';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation)
    private readonly invitationRepository: Repository<Invitation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private readonly userOrgRepository: Repository<UserOrganization>,
    private readonly jwtService: JwtService
  ) {}

  /**
   * Create an invitation for a user to join an organization
   * Only OWNER and ADMIN can invite users
   * ADMIN cannot invite users as OWNER
   */
  async createInvitation(
    dto: CreateInvitationDto,
    inviterId: string,
    inviterRole: OrganizationRole
  ): Promise<Invitation> {
    // Only OWNER and ADMIN can invite
    if (![OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(inviterRole)) {
      throw new ForbiddenException('Only OWNER or ADMIN can invite users');
    }

    // ADMIN cannot invite OWNER
    if (inviterRole === OrganizationRole.ADMIN && dto.role === OrganizationRole.OWNER) {
      throw new ForbiddenException('ADMIN cannot invite users as OWNER');
    }

    // Check if organization exists
    const organization = await this.organizationRepository.findOne({
      where: { id: dto.organizationId },
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if user is already a member
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      const existingMembership = await this.userOrgRepository.findOne({
        where: {
          organizationId: dto.organizationId,
          userId: existingUser.id,
        },
      });
      if (existingMembership) {
        throw new ConflictException('User is already a member of this organization');
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await this.invitationRepository.findOne({
      where: {
        email: dto.email,
        organizationId: dto.organizationId,
        status: InvitationStatus.PENDING,
      },
    });
    if (existingInvitation) {
      throw new ConflictException('An invitation is already pending for this email');
    }

    // Generate unique token
    const token = randomBytes(32).toString('hex');

    // Set expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = this.invitationRepository.create({
      email: dto.email,
      token,
      role: dto.role,
      organizationId: dto.organizationId,
      invitedById: inviterId,
      expiresAt,
    });

    return this.invitationRepository.save(invitation);
  }

  /**
   * Accept an invitation and register/add user to organization
   * Returns JWT token for automatic login
   */
  async acceptInvitation(dto: AcceptInvitationDto): Promise<{
    access_token: string;
    user: { id: string; email: string };
    organization: { id: string; name: string };
    role: OrganizationRole;
  }> {
    const invitation = await this.invitationRepository.findOne({
      where: { token: dto.token },
      relations: ['organization'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(`Invitation is ${invitation.status.toLowerCase()}`);
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      throw new BadRequestException('Invitation has expired');
    }

    // Check if user already exists
    let user = await this.userRepository.findOne({
      where: { email: invitation.email },
    });

    if (!user) {
      // Create new user
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      user = this.userRepository.create({
        email: invitation.email,
        password: hashedPassword,
      });
      user = await this.userRepository.save(user);
    }

    // Check if already a member (edge case)
    const existingMembership = await this.userOrgRepository.findOne({
      where: { userId: user.id, organizationId: invitation.organizationId },
    });

    if (!existingMembership) {
      // Add user to organization with specified role
      const membership = this.userOrgRepository.create({
        userId: user.id,
        organizationId: invitation.organizationId,
        role: invitation.role,
      });
      await this.userOrgRepository.save(membership);
    }

    // Mark invitation as accepted
    invitation.status = InvitationStatus.ACCEPTED;
    invitation.acceptedAt = new Date();
    await this.invitationRepository.save(invitation);

    // Generate JWT token for automatic login
    const payload = { sub: user.id, email: user.email };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: { id: user.id, email: user.email },
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
      },
      role: invitation.role,
    };
  }

  /**
   * Get invitation details by token (public endpoint for invitation page)
   */
  async getInvitationByToken(token: string): Promise<{
    id: string;
    email: string;
    role: OrganizationRole;
    status: InvitationStatus;
    organization: { id: string; name: string };
    invitedBy: { id: string; email: string } | null;
    expiresAt: Date;
    isExpired: boolean;
  }> {
    const invitation = await this.invitationRepository.findOne({
      where: { token },
      relations: ['organization', 'invitedBy'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    const isExpired = new Date() > invitation.expiresAt;

    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
      },
      invitedBy: invitation.invitedBy
        ? { id: invitation.invitedBy.id, email: invitation.invitedBy.email }
        : null,
      expiresAt: invitation.expiresAt,
      isExpired,
    };
  }

  /**
   * Get all invitations for an organization
   */
  async getOrganizationInvitations(organizationId: string): Promise<Invitation[]> {
    return this.invitationRepository.find({
      where: { organizationId },
      relations: ['invitedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Revoke a pending invitation
   */
  async revokeInvitation(
    invitationId: string,
    userId: string,
    userRole: OrganizationRole
  ): Promise<{ message: string }> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException('Can only revoke pending invitations');
    }

    // Only OWNER and ADMIN can revoke
    if (![OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(userRole)) {
      throw new ForbiddenException('Only OWNER or ADMIN can revoke invitations');
    }

    invitation.status = InvitationStatus.REVOKED;
    await this.invitationRepository.save(invitation);

    return { message: 'Invitation revoked successfully' };
  }

  /**
   * Resend an invitation (creates a new token and extends expiration)
   */
  async resendInvitation(
    invitationId: string,
    userId: string,
    userRole: OrganizationRole
  ): Promise<Invitation> {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new BadRequestException('Cannot resend an accepted invitation');
    }

    // Only OWNER and ADMIN can resend
    if (![OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(userRole)) {
      throw new ForbiddenException('Only OWNER or ADMIN can resend invitations');
    }

    // Generate new token and extend expiration
    invitation.token = randomBytes(32).toString('hex');
    invitation.status = InvitationStatus.PENDING;
    invitation.expiresAt = new Date();
    invitation.expiresAt.setDate(invitation.expiresAt.getDate() + 7);

    return this.invitationRepository.save(invitation);
  }
}
