import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ClientCredentialsDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('token')
  token(@Body() dto: ClientCredentialsDto) {
    return this.authService.generateToken(dto.client_id, dto.client_secret);
  }
}
