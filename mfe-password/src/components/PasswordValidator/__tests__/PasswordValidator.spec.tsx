import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PasswordValidator from "../PasswordValidator";
import { validatePassword } from "@/services/password.service";

jest.mock("@/assets", () => ({
  CloseEyeIcon: () => <svg data-testid="close-eye-icon" />,
  OpenEyeIcon: () => <svg data-testid="open-eye-icon" />,
}));

jest.mock("@/services/password.service");

const mockValidatePassword = validatePassword as jest.MockedFunction<
  typeof validatePassword
>;

describe("PasswordValidator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("renderização inicial", () => {
    it("renderiza o título do componente", () => {
      render(<PasswordValidator />);
      expect(screen.getByText("Validador de Senha")).toBeInTheDocument();
    });

    it("renderiza o campo de senha", () => {
      render(<PasswordValidator />);
      expect(screen.getByLabelText("Campo de senha")).toBeInTheDocument();
    });

    it("renderiza o botão de validar desabilitado quando o campo está vazio", () => {
      render(<PasswordValidator />);
      expect(screen.getByRole("button", { name: "Validar" })).toBeDisabled();
    });

    it("campo de senha começa do tipo password (oculto)", () => {
      render(<PasswordValidator />);
      expect(screen.getByLabelText("Campo de senha")).toHaveAttribute(
        "type",
        "password",
      );
    });

    it("exibe o ícone de mostrar senha inicialmente", () => {
      render(<PasswordValidator />);
      expect(screen.getByTestId("open-eye-icon")).toBeInTheDocument();
    });
  });

  describe("interação com o campo de senha", () => {
    it("habilita o botão de validar ao digitar uma senha", async () => {
      render(<PasswordValidator />);
      await userEvent.type(screen.getByLabelText("Campo de senha"), "abc");
      expect(screen.getByRole("button", { name: "Validar" })).toBeEnabled();
    });

    it("limpa o resultado ao digitar novamente após uma validação", async () => {
      render(<PasswordValidator />);
      const input = screen.getByLabelText("Campo de senha");

      await userEvent.type(input, "abc");
      await userEvent.click(screen.getByRole("button", { name: "Validar" }));

      await waitFor(() => {
        expect(screen.getByRole("status")).toBeInTheDocument();
      });

      await userEvent.type(input, "x");
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  describe("toggle de visibilidade da senha", () => {
    it("alterna para tipo text ao clicar em mostrar senha", async () => {
      render(<PasswordValidator />);
      const toggleBtn = screen.getByLabelText("Mostrar senha");
      await userEvent.click(toggleBtn);
      expect(screen.getByLabelText("Campo de senha")).toHaveAttribute(
        "type",
        "text",
      );
    });

    it("exibe o ícone de ocultar após clicar em mostrar", async () => {
      render(<PasswordValidator />);
      await userEvent.click(screen.getByLabelText("Mostrar senha"));
      expect(screen.getByTestId("close-eye-icon")).toBeInTheDocument();
    });

    it("volta para tipo password ao clicar novamente", async () => {
      render(<PasswordValidator />);
      const toggleBtn = screen.getByLabelText("Mostrar senha");
      await userEvent.click(toggleBtn);
      await userEvent.click(screen.getByLabelText("Ocultar senha"));
      expect(screen.getByLabelText("Campo de senha")).toHaveAttribute(
        "type",
        "password",
      );
    });
  });

  describe("validação do formulário", () => {
    describe("senha inválida — validação local (fieldValidator)", () => {
      it("exibe 'Senha inválida' sem chamar a API", async () => {
        render(<PasswordValidator />);
        await userEvent.type(screen.getByLabelText("Campo de senha"), "abc");
        await userEvent.click(screen.getByRole("button", { name: "Validar" }));

        await waitFor(() => {
          expect(screen.getByText("✗ Senha inválida")).toBeInTheDocument();
        });
        expect(mockValidatePassword).not.toHaveBeenCalled();
      });

      it("exibe a lista de erros quando a senha não passa na validação local", async () => {
        render(<PasswordValidator />);
        await userEvent.type(screen.getByLabelText("Campo de senha"), "abc");
        await userEvent.click(screen.getByRole("button", { name: "Validar" }));

        await waitFor(() => {
          expect(
            screen.getByText("A senha deve ter pelo menos 9 caracteres"),
          ).toBeInTheDocument();
          expect(
            screen.getByText("A senha deve ter pelo menos 1 dígito"),
          ).toBeInTheDocument();
          expect(
            screen.getByText("A senha deve ter pelo menos 1 letra maiúscula"),
          ).toBeInTheDocument();
        });
      });
    });

    describe("senha válida localmente — chama a API (validatePassword)", () => {
      it("chama validatePassword quando fieldValidator passa", async () => {
        mockValidatePassword.mockResolvedValueOnce({ valid: true, errors: [] });

        render(<PasswordValidator />);
        await userEvent.type(
          screen.getByLabelText("Campo de senha"),
          "AbcDefG1!",
        );
        await userEvent.click(screen.getByRole("button", { name: "Validar" }));

        await waitFor(() => {
          expect(mockValidatePassword).toHaveBeenCalledWith("AbcDefG1!");
        });
      });

      it("exibe 'Senha válida' com o resultado da API", async () => {
        mockValidatePassword.mockResolvedValueOnce({ valid: true, errors: [] });

        render(<PasswordValidator />);
        await userEvent.type(
          screen.getByLabelText("Campo de senha"),
          "AbcDefG1!",
        );
        await userEvent.click(screen.getByRole("button", { name: "Validar" }));

        await waitFor(() => {
          expect(screen.getByText("✓ Senha válida")).toBeInTheDocument();
        });
        expect(screen.queryByRole("list")).not.toBeInTheDocument();
      });

      it("exibe erros da API quando o backend rejeita a senha", async () => {
        mockValidatePassword.mockResolvedValueOnce({
          valid: false,
          errors: ["Senha encontrada em lista de senhas comprometidas"],
        });

        render(<PasswordValidator />);
        await userEvent.type(
          screen.getByLabelText("Campo de senha"),
          "AbcDefG1!",
        );
        await userEvent.click(screen.getByRole("button", { name: "Validar" }));

        await waitFor(() => {
          expect(screen.getByText("✗ Senha inválida")).toBeInTheDocument();
          expect(
            screen.getByText(
              "Senha encontrada em lista de senhas comprometidas",
            ),
          ).toBeInTheDocument();
        });
      });

      it("exibe banner de erro quando a API falha", async () => {
        mockValidatePassword.mockRejectedValueOnce(new Error("Network error"));

        render(<PasswordValidator />);
        await userEvent.type(
          screen.getByLabelText("Campo de senha"),
          "AbcDefG1!",
        );
        await userEvent.click(screen.getByRole("button", { name: "Validar" }));

        await waitFor(() => {
          expect(
            screen.getByText(
              "Falha ao conectar ao serviço de validação. O backend está rodando?",
            ),
          ).toBeInTheDocument();
        });
      });
    });

    it("o resultado tem aria-live='polite' para acessibilidade", async () => {
      mockValidatePassword.mockResolvedValueOnce({ valid: true, errors: [] });

      render(<PasswordValidator />);
      await userEvent.type(
        screen.getByLabelText("Campo de senha"),
        "AbcDefG1!",
      );
      await userEvent.click(screen.getByRole("button", { name: "Validar" }));

      await waitFor(() => {
        expect(screen.getByRole("status")).toHaveAttribute(
          "aria-live",
          "polite",
        );
      });
    });
  });
});
