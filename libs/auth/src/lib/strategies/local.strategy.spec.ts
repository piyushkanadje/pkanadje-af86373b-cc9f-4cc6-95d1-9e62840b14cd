import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from './local.strategy';
import { AuthService } from '../auth.service';

describe('LocalStrategy', () => {
  let strategy: LocalStrategy;
  let authService: jest.Mocked<AuthService>;

  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  beforeEach(async () => {
    const mockAuthService = {
      validateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    strategy = module.get<LocalStrategy>(LocalStrategy);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return user data for valid credentials', async () => {
      authService.validateUser.mockResolvedValue(mockUser as any);

      const result = await strategy.validate(
        'test@example.com',
        'Password123!'
      );

      expect(result).toEqual({
        id: 'user-uuid-1',
        email: 'test@example.com',
      });
      expect(authService.validateUser).toHaveBeenCalledWith(
        'test@example.com',
        'Password123!'
      );
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(
        strategy.validate('test@example.com', 'wrongpassword')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      authService.validateUser.mockResolvedValue(null);

      await expect(
        strategy.validate('notfound@example.com', 'Password123!')
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
