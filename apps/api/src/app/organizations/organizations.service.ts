import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Organization,
  UserOrganization,
  OrganizationRole,
} from '@task-manager/data';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private readonly userOrgRepository: Repository<UserOrganization>
  ) {}

  /**
   * Create a new organization
   * The creator automatically becomes the OWNER
   */
  async create(
    dto: CreateOrganizationDto,
    userId: string
  ): Promise<Organization> {
    // If parentId is provided, validate it exists and user has access
    if (dto.parentId) {
      const parentOrg = await this.organizationRepository.findOne({
        where: { id: dto.parentId },
      });

      if (!parentOrg) {
        throw new NotFoundException('Parent organization not found');
      }

      // Check if user is a member of the parent organization
      const userMembership = await this.userOrgRepository.findOne({
        where: { userId, organizationId: dto.parentId },
      });

      if (!userMembership) {
        throw new ForbiddenException(
          'You must be a member of the parent organization to create a sub-organization'
        );
      }

      // Only OWNER or ADMIN can create sub-organizations
      if (
        ![OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(
          userMembership.role
        )
      ) {
        throw new ForbiddenException(
          'Only OWNER or ADMIN can create sub-organizations'
        );
      }
    }

    // Create the organization
    const organization = this.organizationRepository.create({
      name: dto.name,
      parentId: dto.parentId || null,
    });

    const savedOrg = await this.organizationRepository.save(organization);

    // Make the creator the OWNER of the organization
    const userOrg = this.userOrgRepository.create({
      userId,
      organizationId: savedOrg.id,
      role: OrganizationRole.OWNER,
    });

    await this.userOrgRepository.save(userOrg);

    return savedOrg;
  }

  /**
   * Get all organizations the user is a member of
   */
  async findAllForUser(userId: string): Promise<Organization[]> {
    const memberships = await this.userOrgRepository.find({
      where: { userId },
      relations: ['organization', 'organization.parent'],
    });

    return memberships.map((m) => m.organization);
  }

  /**
   * Get a single organization by ID
   * User must be a member
   */
  async findOne(id: string, userId: string): Promise<Organization> {
    const membership = await this.userOrgRepository.findOne({
      where: { userId, organizationId: id },
      relations: ['organization', 'organization.parent', 'organization.children'],
    });

    if (!membership) {
      throw new NotFoundException(
        'Organization not found or you are not a member'
      );
    }

    return membership.organization;
  }

  /**
   * Update an organization
   * Only OWNER or ADMIN can update
   */
  async update(
    id: string,
    dto: UpdateOrganizationDto,
    userId: string
  ): Promise<Organization> {
    const membership = await this.userOrgRepository.findOne({
      where: { userId, organizationId: id },
      relations: ['organization'],
    });

    if (!membership) {
      throw new NotFoundException(
        'Organization not found or you are not a member'
      );
    }

    if (
      ![OrganizationRole.OWNER, OrganizationRole.ADMIN].includes(membership.role)
    ) {
      throw new ForbiddenException(
        'Only OWNER or ADMIN can update the organization'
      );
    }

    const organization = membership.organization;

    if (dto.name !== undefined) {
      organization.name = dto.name;
    }

    return this.organizationRepository.save(organization);
  }

  /**
   * Delete an organization
   * Only OWNER can delete
   */
  async remove(id: string, userId: string): Promise<void> {
    const membership = await this.userOrgRepository.findOne({
      where: { userId, organizationId: id },
      relations: ['organization'],
    });

    if (!membership) {
      throw new NotFoundException(
        'Organization not found or you are not a member'
      );
    }

    if (membership.role !== OrganizationRole.OWNER) {
      throw new ForbiddenException('Only OWNER can delete the organization');
    }

    // Check if organization has children
    const childCount = await this.organizationRepository.count({
      where: { parentId: id },
    });

    if (childCount > 0) {
      throw new BadRequestException(
        'Cannot delete organization with sub-organizations. Delete children first.'
      );
    }

    await this.organizationRepository.remove(membership.organization);
  }

  /**
   * Get the user's role in an organization
   */
  async getUserRole(
    userId: string,
    organizationId: string
  ): Promise<OrganizationRole | null> {
    const membership = await this.userOrgRepository.findOne({
      where: { userId, organizationId },
    });

    return membership?.role ?? null;
  }

  /**
   * Get organization members
   */
  async getMembers(
    organizationId: string,
    userId: string
  ): Promise<UserOrganization[]> {
    // Verify user is a member
    const membership = await this.userOrgRepository.findOne({
      where: { userId, organizationId },
    });

    if (!membership) {
      throw new NotFoundException(
        'Organization not found or you are not a member'
      );
    }

    return this.userOrgRepository.find({
      where: { organizationId },
      relations: ['user'],
    });
  }
}
