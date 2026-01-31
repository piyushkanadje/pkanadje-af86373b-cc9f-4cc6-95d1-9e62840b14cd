import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsUUID } from 'class-validator';
import { OrganizationRole } from '@task-manager/data';

export class CreateInvitationDto {
  @ApiProperty({
    description: 'Email address of the user to invite',
    example: 'newuser@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Role to assign to the invited user',
    enum: OrganizationRole,
    example: OrganizationRole.VIEWER,
  })
  @IsEnum(OrganizationRole)
  role: OrganizationRole;

  @ApiProperty({
    description: 'Organization ID to invite the user to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  organizationId: string;
}
