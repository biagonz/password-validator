import { Injectable } from '@nestjs/common';

// Representa o resultado detalhado da validação
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable() // Permite que o NestJS injete este serviço em outros lugares
export class PasswordService {
  // Caracteres especiais aceitos conforme o desafio
  private readonly SPECIAL_CHARS = '!@#$%^&*()-+';

  validate(password: string): ValidationResult {
    const errors: string[] = [];

    if (password !== password.trim() || password.includes(' ')) {
      errors.push('A senha não deve conter espaços');
    }

    if (password.length < 9) {
      errors.push('A senha deve ter pelo menos 9 caracteres');
    }

    if (!/\d/.test(password)) {
      errors.push('A senha deve ter pelo menos 1 dígito');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('A senha deve ter pelo menos 1 letra minúscula');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('A senha deve ter pelo menos 1 letra maiúscula');
    }

    // Caracteres não-alfanuméricos presentes na senha
    const specialCharsInPassword = [...password].filter((char) =>
      /[^a-zA-Z0-9]/.test(char),
    );

    // Pelo menos 1 especial obrigatório, e todos devem estar na lista permitida
    const hasSpecialChar = specialCharsInPassword.some((char) =>
      this.SPECIAL_CHARS.includes(char),
    );
    const hasInvalidSpecialChar = specialCharsInPassword.some(
      (char) => !this.SPECIAL_CHARS.includes(char),
    );

    if (!hasSpecialChar) {
      errors.push(
        `A senha deve ter pelo menos 1 caractere especial (${this.SPECIAL_CHARS})`,
      );
    }

    if (hasInvalidSpecialChar) {
      errors.push(
        `A senha contém caracteres especiais não permitidos. Use apenas: ${this.SPECIAL_CHARS}`,
      );
    }

    const uniqueChars = new Set(password.split(''));
    if (uniqueChars.size !== password.length) {
      errors.push('A senha não deve ter caracteres repetidos');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
