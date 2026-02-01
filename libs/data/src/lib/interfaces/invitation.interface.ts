import { InvitationStatus, OrganizationRole } from '../enums';

export interface IInvitation {
  id: string;
  email: string;
  token: string;
  role: OrganizationRole;
  status: InvitationStatus;
  organizationId: string;
  organizationName?: string;
  inviterId: string;
  inviterEmail?: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICreateInvitation {
  email: string;
  role: OrganizationRole;
  organizationId: string;
}

export interface IAcceptInvitation {
  token: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface IOrganizationMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: OrganizationRole;
  joinedAt: Date;
}
