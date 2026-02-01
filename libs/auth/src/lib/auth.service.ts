import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, UserOrganization, OrganizationRole } from '@task-manager/data';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserOrganization)
    private readonly userOrgRepository: Repository<UserOrganization>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findUserById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findUserWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async createUser(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
    });
    return this.userRepository.save(user);
  }

  async getUserOrganizationRole(
    userId: string,
    organizationId: string
  ): Promise<OrganizationRole | null> {
    const membership = await this.userOrgRepository.findOne({
      where: { userId, organizationId },
    });
    return membership?.role ?? null;
  }

  async getUserOrganizations(userId: string): Promise<UserOrganization[]> {
    return this.userOrgRepository.find({
      where: { userId },
      relations: ['organization'],
    });
  }

  async validatePassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Validates user credentials for login
   * @returns User object without password if valid, null otherwise
   */
  async validateUser(
    email: string,
    password: string
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.findUserWithPassword(email);
    if (!user) {
      return null;
    }

    const isPasswordValid = await this.validatePassword(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword as Omit<User, 'password'>;
  }

  /**
   * Generates JWT token for authenticated user
   */
  async login(user: { id: string; email: string }): Promise<LoginResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
      },
    };
  }

  /**
   * Registers a new user and returns JWT token
   */
  async register(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<LoginResponse> {
    // Check if user already exists
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create new user (password hashing handled by createUser)
    const newUser = await this.createUser(email, password, firstName, lastName);

    // Auto-login after registration
    return this.login(newUser);
  }

  /**
   * Find user by ID with password field included
   */
  async findUserByIdWithPassword(id: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
  }

  /**
   * Changes user password after validating current password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const user = await this.findUserByIdWithPassword(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await this.validatePassword(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update(userId, { password: hashedNewPassword });

    return { message: 'Password changed successfully' };
  }

  /**
   * Generates a password reset token and stores it
   * Returns the token (to be sent via email)
   */
  async generatePasswordResetToken(email: string): Promise<string | null> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      // Return null silently to prevent email enumeration
      return null;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.userRepository.update(user.id, {
      resetToken,
      resetTokenExpiry,
    });

    return resetToken;
  }

  /**
   * Validates a password reset token
   */
  async validatePasswordResetToken(
    token: string
  ): Promise<{ valid: boolean; email?: string }> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.resetToken')
      .addSelect('user.resetTokenExpiry')
      .where('user.resetToken = :token', { token })
      .getOne();

    if (!user) {
      return { valid: false };
    }

    if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      return { valid: false };
    }

    return { valid: true, email: user.email };
  }

  /**
   * Resets password using a valid reset token
   */
  async resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ message: string }> {
    const validation = await this.validatePasswordResetToken(token);
    if (!validation.valid) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.resetToken')
      .where('user.resetToken = :token', { token })
      .getOne();

    if (!user) {
      throw new BadRequestException('Invalid reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update(user.id, {
      password: hashedPassword,
      resetToken: undefined,
      resetTokenExpiry: undefined,
    });

    return { message: 'Password reset successfully' };
  }
}
