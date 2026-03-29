export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const SPECIAL_CHARS = "!@#$%^&*()-+";

export const fieldValidator = (password: string): ValidationResult => {
  const errors: string[] = [];

  if (password !== password.trim() || password.includes(" ")) {
    errors.push("A senha não deve conter espaços");
  }

  if (password.length < 9) {
    errors.push("A senha deve ter pelo menos 9 caracteres");
  }

  if (!/\d/.test(password)) {
    errors.push("A senha deve ter pelo menos 1 dígito");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("A senha deve ter pelo menos 1 letra minúscula");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("A senha deve ter pelo menos 1 letra maiúscula");
  }

  const hasSpecialChar = [...password].some((char) =>
    SPECIAL_CHARS.includes(char),
  );

  if (!hasSpecialChar) {
    errors.push(
      `A senha deve ter pelo menos 1 caractere especial (${SPECIAL_CHARS})`,
    );
  }

  const uniqueChars = new Set(password.split(""));
  if (uniqueChars.size !== password.length) {
    errors.push("A senha não deve ter caracteres repetidos");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
