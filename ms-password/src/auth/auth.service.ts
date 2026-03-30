import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  generateToken(
    clientId: string,
    clientSecret: string,
  ): { access_token: string } {
    const validClientId = this.configService.get<string>('CLIENT_ID');
    const validClientSecret = this.configService.get<string>('CLIENT_SECRET');

    // Compara as credenciais enviadas com as configuradas no .env
    if (clientId !== validClientId || clientSecret !== validClientSecret) {
      throw new UnauthorizedException('Invalid client credentials');
    }

    // O "payload" é o conteúdo do token — fica visível para quem decodifica
    const payload = {
      sub: clientId,
      scope: 'password:validate',
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
