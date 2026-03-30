import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PasswordService } from './password.service';
import { ValidatePasswordDto } from './password.dto';

@Controller('password') // Todas as rotas aqui começam com /password
export class PasswordController {
  constructor(private readonly passwordService: PasswordService) {}

  @Post('validate')
  @UseGuards(JwtAuthGuard)
  validate(@Body() dto: ValidatePasswordDto) {
    return this.passwordService.validate(dto.password);
  }
}
