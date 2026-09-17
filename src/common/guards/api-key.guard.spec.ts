import { ApiKeyGuard } from './api-key.guard';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService();
    jest.spyOn(configService, 'get').mockReturnValue('valid_secret_key');
    guard = new ApiKeyGuard(configService);
  });

  const createMockContext = (headers: Record<string, string>): ExecutionContext => {
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ headers }),
      }),
    } as any;
  };

  it('should allow access with valid x-api-key header', () => {
    const context = createMockContext({ 'x-api-key': 'valid_secret_key' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw UnauthorizedException when api key header is missing', () => {
    const context = createMockContext({});
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when api key is invalid', () => {
    const context = createMockContext({ 'x-api-key': 'wrong_key' });
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
