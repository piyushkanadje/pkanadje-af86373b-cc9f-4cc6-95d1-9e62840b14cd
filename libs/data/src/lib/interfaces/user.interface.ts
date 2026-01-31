import { OrganizationRole } from '../enums/role.enum';

export interface IUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserWithOrganizations extends IUser {
  organizationMemberships: IUserOrganizationMembership[];
}

export interface IUserOrganizationMembership {
  organizationId: string;
  organizationName: string;
  role: OrganizationRole;
}
