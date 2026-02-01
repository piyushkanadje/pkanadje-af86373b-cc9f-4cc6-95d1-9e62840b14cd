import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from '../auth.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let authService: jest.Mocked<AuthService>;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockAuthService = {
      findUserById: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return user data for valid payload', async () => {
      const payload = { sub: 'user-uuid-1', email: 'test@example.com' };
      authService.findUserById.mockResolvedValue(mockUser as any);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-uuid-1',
        email: 'test@example.com',
      });
      expect(authService.findUserById).toHaveBeenCalledWith('user-uuid-1');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const payload = { sub: 'non-existent-user', email: 'notfound@example.com' };
      authService.findUserById.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('constructor', () => {
    it('should throw error if JWT_SECRET is not configured', () => {
      const mockConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const mockAuthService = {
        findUserById: jest.fn(),
      };

      expect(() => {
        new JwtStrategy(
          mockConfigService as any,
          mockAuthService as any
        );
      }).toThrow('JWT_SECRET environment variable is not configured');
    });
  });
});
