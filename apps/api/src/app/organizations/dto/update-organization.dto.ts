import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateOrganizationDto {
  @ApiPropertyOptional({
    description: 'New name for the organization',
    example: 'Acme Inc.',
    minLength: 2,
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Organization name must be at least 2 characters' })
  @MaxLength(255, { message: 'Organization name must not exceed 255 characters' })
  name?: string;
}
