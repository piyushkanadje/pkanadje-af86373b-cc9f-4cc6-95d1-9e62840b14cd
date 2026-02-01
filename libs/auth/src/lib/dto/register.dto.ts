import { IsEmail, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsString({ message: 'First name must be a string' })
  @MinLength(1, { message: 'First name is required' })
  @MaxLength(100, { message: 'First name must not exceed 100 characters' })
  firstName!: string;

  @IsString({ message: 'Last name must be a string' })
  @MinLength(1, { message: 'Last name is required' })
  @MaxLength(100, { message: 'Last name must not exceed 100 characters' })
  lastName!: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(50, { message: 'Password must not exceed 50 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password!: string;
}
