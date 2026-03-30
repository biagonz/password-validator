import { PasswordService } from './password.service';

// describe = agrupa testes relacionados
describe('PasswordService', () => {
  let service: PasswordService;

  // beforeEach = executa antes de cada teste — garante um serviço limpo por teste
  beforeEach(() => {
    service = new PasswordService();
  });

  // Casos do enunciado do desafio
  describe('challenge examples', () => {
    it('should return false for empty string', () => {
      expect(service.validate('').valid).toBe(false);
    });

    it('should return false for "aa" (too short, repeated)', () => {
      expect(service.validate('aa').valid).toBe(false);
    });

    it('should return false for "ab" (too short)', () => {
      expect(service.validate('ab').valid).toBe(false);
    });

    it('should return false for "AAAbbbCc" (no digit, no special)', () => {
      expect(service.validate('AAAbbbCc').valid).toBe(false);
    });

    it('should return false for "AbTp9!foo" (repeated chars: o, f)', () => {
      expect(service.validate('AbTp9!foo').valid).toBe(false);
    });

    it('should return false for "AbTp9!foA" (repeated: A)', () => {
      expect(service.validate('AbTp9!foA').valid).toBe(false);
    });

    it('should return false for "AbTp9 fok" (contains space)', () => {
      expect(service.validate('AbTp9 fok').valid).toBe(false);
    });

    it('should return true for "AbTp9!fok"', () => {
      expect(service.validate('AbTp9!fok').valid).toBe(true);
    });
  });

  describe('individual rules', () => {
    it('should fail when less than 9 characters', () => {
      const result = service.validate('Ab1!xyz');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('A senha deve ter pelo menos 9 caracteres');
    });

    it('should fail when no digit', () => {
      const result = service.validate('AbcDefG!h');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('A senha deve ter pelo menos 1 dígito');
    });

    it('should fail when no uppercase', () => {
      const result = service.validate('abcdefg1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('A senha deve ter pelo menos 1 letra maiúscula');
    });

    it('should fail when no lowercase', () => {
      const result = service.validate('ABCDEFG1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('A senha deve ter pelo menos 1 letra minúscula');
    });

    it('should fail when no special character', () => {
      const result = service.validate('AbcDefG1h');
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('pelo menos 1 caractere especial'),
      );
    });

    it('should fail when special character is not in the allowed list', () => {
      // '~' não está em !@#$%^&*()-+
      const result = service.validate('AbcDefG1~');
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('caracteres especiais não permitidos'),
      );
    });

    it('should fail when has repeated characters', () => {
      // 'AbcDeeG1!' tem 'e' repetido
      const result = service.validate('AbcDeeG1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('A senha não deve ter caracteres repetidos');
    });

    it('should fail when contains spaces', () => {
      const result = service.validate('AbcDef G1!');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('A senha não deve conter espaços');
    });
  });

  describe('valid passwords', () => {
    it('should accept a valid password with all requirements met', () => {
      const result = service.validate('AbTp9!fok');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept another valid password', () => {
      const result = service.validate('Xw3@qLm7z');
      expect(result.valid).toBe(true);
    });
  });
});
