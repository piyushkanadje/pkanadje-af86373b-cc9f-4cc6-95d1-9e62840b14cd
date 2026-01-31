import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, IsOptional, IsEmail } from 'class-validator';

export class AcceptInvitationDto {
  @ApiProperty({
    description: 'Invitation token',
    example: 'abc123def456...',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'Password for new user registration',
    example: 'securePassword123',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({
    description: 'Name of the user (optional)',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  name?: string;
}
