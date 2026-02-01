import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Name of the organization',
    example: 'Acme Corporation',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @MinLength(2, { message: 'Organization name must be at least 2 characters' })
  @MaxLength(255, { message: 'Organization name must not exceed 255 characters' })
  name: string;

  @ApiPropertyOptional({
    description: 'Parent organization ID for creating sub-organizations',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID('4', { message: 'Parent ID must be a valid UUID' })
  parentId?: string;
}
