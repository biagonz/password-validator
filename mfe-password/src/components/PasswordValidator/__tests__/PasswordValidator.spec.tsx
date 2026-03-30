import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PasswordValidator from "../PasswordValidator";

// Mocka os ícones SVG para simplificar o DOM nos testes
jest.mock("@/assets", () => ({
  CloseEyeIcon: () => <svg data-testid="close-eye-icon" />,
  OpenEyeIcon: () => <svg data-testid="open-eye-icon" />,
}));

describe("PasswordValidator", () => {
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

      await userEvent.type(input, "AbcDefG1!");
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
    it("exibe 'Senha válida' ao submeter uma senha válida", async () => {
      render(<PasswordValidator />);
      await userEvent.type(
        screen.getByLabelText("Campo de senha"),
        "AbcDefG1!",
      );
      await userEvent.click(screen.getByRole("button", { name: "Validar" }));

      await waitFor(() => {
        expect(screen.getByText("✓ Senha válida")).toBeInTheDocument();
      });
    });

    it("exibe 'Senha inválida' ao submeter uma senha inválida", async () => {
      render(<PasswordValidator />);
      await userEvent.type(screen.getByLabelText("Campo de senha"), "abc");
      await userEvent.click(screen.getByRole("button", { name: "Validar" }));

      await waitFor(() => {
        expect(screen.getByText("✗ Senha inválida")).toBeInTheDocument();
      });
    });

    it("exibe a lista de erros quando a senha é inválida", async () => {
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

    it("não exibe lista de erros quando a senha é válida", async () => {
      render(<PasswordValidator />);
      await userEvent.type(
        screen.getByLabelText("Campo de senha"),
        "AbcDefG1!",
      );
      await userEvent.click(screen.getByRole("button", { name: "Validar" }));

      await waitFor(() => {
        expect(screen.queryByRole("list")).not.toBeInTheDocument();
      });
    });

    it("o resultado tem aria-live='polite' para acessibilidade", async () => {
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
