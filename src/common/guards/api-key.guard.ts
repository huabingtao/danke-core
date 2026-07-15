import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    // 从环境变量中读取设定的 API Key
    const expectedApiKey = this.configService.get<string>('ADMIN_API_KEY');

    if (!expectedApiKey) {
      throw new UnauthorizedException('服务器未配置 ADMIN_API_KEY 安全密钥');
    }

    if (apiKey !== expectedApiKey) {
      throw new UnauthorizedException('无效的 API Key，请求写入被拒绝');
    }

    return true;
  }
}
