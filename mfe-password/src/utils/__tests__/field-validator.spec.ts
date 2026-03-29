import { fieldValidator } from "../field-validator";

describe("fieldValidator", () => {
  describe("senha válida", () => {
    it("retorna valid=true quando todos os critérios são atendidos", () => {
      const result = fieldValidator("AbcDefG1!");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("regra: espaços", () => {
    it("rejeita senha com espaço no meio", () => {
      const result = fieldValidator("AbcDef 1!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("A senha não deve conter espaços");
    });

    it("rejeita senha com espaço no início", () => {
      const result = fieldValidator(" AbcDef1!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("A senha não deve conter espaços");
    });

    it("rejeita senha com espaço no final", () => {
      const result = fieldValidator("AbcDef1! ");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("A senha não deve conter espaços");
    });
  });

  describe("regra: mínimo de 9 caracteres", () => {
    it("rejeita senha com 8 caracteres", () => {
      const result = fieldValidator("AbcDef1!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "A senha deve ter pelo menos 9 caracteres",
      );
    });

    it("aceita senha com exatamente 9 caracteres", () => {
      const result = fieldValidator("AbcDefG1!");
      expect(result.errors).not.toContain(
        "A senha deve ter pelo menos 9 caracteres",
      );
    });
  });

  describe("regra: pelo menos 1 dígito", () => {
    it("rejeita senha sem dígito", () => {
      const result = fieldValidator("AbcDefGh!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("A senha deve ter pelo menos 1 dígito");
    });

    it("aceita senha com dígito", () => {
      const result = fieldValidator("AbcDefG1!");
      expect(result.errors).not.toContain(
        "A senha deve ter pelo menos 1 dígito",
      );
    });
  });

  describe("regra: pelo menos 1 letra minúscula", () => {
    it("rejeita senha sem letra minúscula", () => {
      const result = fieldValidator("ABCDEFG1!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "A senha deve ter pelo menos 1 letra minúscula",
      );
    });

    it("aceita senha com letra minúscula", () => {
      const result = fieldValidator("AbcDefG1!");
      expect(result.errors).not.toContain(
        "A senha deve ter pelo menos 1 letra minúscula",
      );
    });
  });

  describe("regra: pelo menos 1 letra maiúscula", () => {
    it("rejeita senha sem letra maiúscula", () => {
      const result = fieldValidator("abcdefg1!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "A senha deve ter pelo menos 1 letra maiúscula",
      );
    });

    it("aceita senha com letra maiúscula", () => {
      const result = fieldValidator("AbcDefG1!");
      expect(result.errors).not.toContain(
        "A senha deve ter pelo menos 1 letra maiúscula",
      );
    });
  });

  describe("regra: pelo menos 1 caractere especial", () => {
    it("rejeita senha sem caractere especial", () => {
      const result = fieldValidator("AbcDefG12");
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toMatch(/caractere especial/);
    });

    it("aceita cada um dos caracteres especiais permitidos", () => {
      const specialChars = "!@#$%^&*()-+";
      for (const char of specialChars) {
        const password = `AbcDefG1${char}`;
        const result = fieldValidator(password);
        expect(
          result.errors.some((e) => e.includes("caractere especial")),
        ).toBe(false);
      }
    });
  });

  describe("regra: sem caracteres repetidos", () => {
    it("rejeita senha com caractere repetido", () => {
      const result = fieldValidator("AAbcDef1!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "A senha não deve ter caracteres repetidos",
      );
    });

    it("aceita senha sem repetição", () => {
      const result = fieldValidator("AbcDefG1!");
      expect(result.errors).not.toContain(
        "A senha não deve ter caracteres repetidos",
      );
    });
  });

  describe("múltiplos erros", () => {
    it("acumula todos os erros de uma vez", () => {
      const result = fieldValidator("abc");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it("retorna array de erros vazio quando válida", () => {
      const result = fieldValidator("AbcDefG1!");
      expect(result.errors).toEqual([]);
    });
  });
});
